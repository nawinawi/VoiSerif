import {
  binarizeDouble,
  binarizeInt,
  binarizeString,
  binarizeUint,
  concatBytes,
  findBytesByNumberArray,
  parseLittleEndianDouble,
  parseLittleEndianUint,
} from "./Binary";
import { readFileAsArrayBuffer } from "./File";

export const TSTPRJ_ATTRIBUTE_TYPE = {
  int: 0x01,
  double: 0x04,
  string: 0x05,
} as const;

export type TstprjAttributeType =
  (typeof TSTPRJ_ATTRIBUTE_TYPE)[keyof typeof TSTPRJ_ATTRIBUTE_TYPE];

export class Tstprj {
  private _file: File;
  obj: TstprjElement | null;
  private _isParsing: boolean;
  private _isParsed: boolean;

  constructor(file: File) {
    this._file = file;
  }

  parse: () => Promise<boolean> = async () => {
    if (this._isParsing) return false;
    try {
      this._isParsing = true;

      const binary = new Uint8Array(await readFileAsArrayBuffer(this._file));

      if (binary.length === 0) {
        this.obj = null;
        this._isParsed = false;
        return false;
      }

      const find = (byte: number, start: number = 0) =>
        findBytesByNumberArray(binary, [byte], start);
      const decoder = new TextDecoder("utf-8");
      const decode = (bytes: Uint8Array<ArrayBufferLike>) =>
        decoder.decode(bytes);
      const isLower = (key: string) => /^[a-z]/.test(key);

      const root = new TstprjElement({
        key: "root",
        attributeLength: -1,
        childLength: -1,
      });
      let current = root;
      let idx = 0;

      main: while (true) {
        // 値の後に 00: 上の階層に移動
        while (binary[idx] === 0x00) {
          // 要素が揃っている場合は上の階層に戻る
          while (
            current.attributeLength === current.attributes.length &&
            current.childLength === current.children.length
          ) {
            if (current.parent == null) break main;
            current = current.parent;
          }
          idx++;
        }

        // 値の後に 0x yy: (子要素が)yy個ある
        if (binary[idx] < 0x10) {
          const lenOfLen = binary[idx];
          let len = parseLittleEndianUint(
            binary.slice(idx + 1, idx + 1 + lenOfLen)
          );
          current.childLength = len;
          idx += 1 + lenOfLen;
        }

        // 次の 00 検索
        const sig = find(0x00, idx);
        if (sig === -1) break;

        // 00 が表れるまで key
        const key = decode(binary.slice(idx, sig));

        // 要素数 or データの長さ
        const lenOfLen = binary[sig + 1];
        const len = parseLittleEndianUint(
          binary.slice(sig + 2, sig + 2 + lenOfLen)
        );

        // key が小文字始まり
        if (isLower(key)) {
          const type = binary[sig + 2 + lenOfLen];
          let valLen = len;
          const slice = () =>
            binary.slice(
              sig + 2 + lenOfLen + 1,
              sig + 2 + lenOfLen + 1 + valLen
            );
          let attribute: TstprjAttribute;
          switch (type) {
            case TSTPRJ_ATTRIBUTE_TYPE.int:
              valLen -= 2;
              attribute = this.newAttribute(
                type,
                key,
                parseLittleEndianUint(slice()),
                current
              );
              break;
            case TSTPRJ_ATTRIBUTE_TYPE.double:
              valLen -= 1;
              attribute = this.newAttribute(
                type,
                key,
                parseLittleEndianDouble(slice()),
                current
              );
              break;
            case TSTPRJ_ATTRIBUTE_TYPE.string:
              valLen -= 2;
              attribute = this.newAttribute(
                type,
                key,
                decode(slice()),
                current
              );
              break;
          }
          current.attributes.push(attribute);
          idx = sig + 2 + lenOfLen + len;
        }

        // key が大文字始まり
        else {
          const child = new TstprjElement({
            key,
            parent: current,
            attributeLength: len,
            childLength: 0,
          });
          current.children.push(child);
          current = child;
          idx = sig + 2 + lenOfLen;
        }
      }

      this.obj = root.children.length > 0 ? root.children[0] : null;
      this._isParsed = true;
      return true;
    } catch {
      this._isParsed = false;
      return false;
    } finally {
      this._isParsing = false;
    }
  };

  protected newAttribute: (
    type: TstprjAttributeType,
    key: string,
    value: any,
    parent: TstprjElement
  ) => TstprjAttribute = (type, key, value, parent) => {
    switch (type) {
      case TSTPRJ_ATTRIBUTE_TYPE.int:
        return new TstprjInt(key, value, parent);
      case TSTPRJ_ATTRIBUTE_TYPE.double:
        return new TstprjDouble(key, value, parent);
      case TSTPRJ_ATTRIBUTE_TYPE.string:
        switch (key) {
          case "tsml":
            return new TstprjTsml(key, value, parent);
          default:
            return new TstprjString(key, value, parent);
        }
    }
  };

  serialize: () => Promise<Uint8Array> = async () => {
    return this.obj.serialize();
  };

  toXml: (escape?: boolean) => Promise<string> = async (
    escape: boolean = false
  ) => {
    return this.obj.toXml(escape);
  };

  findElements: (
    callback: (element: TstprjElement) => boolean
  ) => TstprjElement[] = (callback) => {
    return this.obj.findElements(callback);
  };

  getElementsByKeyPath: (keyPath: string | string[]) => TstprjElement[] = (
    keyPath
  ) => {
    return this.obj.getElementsByKeyPath(keyPath);
  };

  getAttributesByKeyPath: (keyPath: string | string[]) => TstprjAttribute[] = (
    keyPath
  ) => {
    return this.obj.getAttributesByKeyPath(keyPath);
  };

  get file() {
    return this._file;
  }

  get isParsing() {
    return this._isParsing;
  }

  get isParsed() {
    return this._isParsed;
  }
}

export class TstprjElement {
  key: string;
  parent: TstprjElement | null;
  attributeLength: number;
  childLength: number;
  attributes: TstprjAttribute[];
  children: TstprjElement[];

  constructor(props: {
    key: string;
    parent?: TstprjElement | null;
    attributeLength?: number;
    childLength?: number;
    attributes?: TstprjAttribute[];
    children?: TstprjElement[];
  }) {
    this.key = props.key;
    this.parent = props.parent ?? null;
    this.attributeLength = props.attributeLength ?? 0;
    this.childLength = props.childLength ?? 0;
    this.attributes = props.attributes ?? [];
    this.children = props.children ?? [];
  }

  serialize: () => Uint8Array = () => {
    const key = binarizeString(this.key);
    const attributeLen = binarizeUint(this.attributes.length, true);
    const attributeLenOflen = binarizeUint(attributeLen.byteLength);
    const attributes = this.attributes.map((attribute) => {
      return attribute.serialize();
    });
    const childLen = binarizeUint(this.children.length);
    const childLenOflen = binarizeUint(childLen.byteLength);
    const children = this.children.map((child) => {
      return child.serialize();
    });
    const bytes: (number | Uint8Array)[] = [];
    bytes.push(key, 0x00, attributeLenOflen, attributeLen, ...attributes);
    if (this.children.length > 0) {
      bytes.push(childLenOflen, childLen, ...children);
    } else {
      bytes.push(0x00);
    }
    return concatBytes(...bytes);
  };

  toXml: (escape?: boolean) => string = (escape = false) => {
    return `<${this.key}${
      this.attributes.length === 0
        ? ""
        : ` ${this.attributes.map((a) => a.toXml(escape)).join(" ")}`
    }${
      this.children.length === 0
        ? " />"
        : `>${this.children.map((c) => c.toXml(escape)).join("")}</${this.key}>`
    }`;
  };

  findElements: (
    callback: (element: TstprjElement) => boolean
  ) => TstprjElement[] = (callback) => {
    return this.children.filter((child) => callback(child));
  };

  getElementsByKeyPath: (keyPath: string | string[]) => TstprjElement[] = (
    keyPath
  ) => {
    const keys = typeof keyPath === "string" ? keyPath.split(".") : keyPath;
    const children = this.children.filter((child) => child.key === keys[0]);
    if (keys.length === 1) return children;
    return children.flatMap((child) =>
      child.getElementsByKeyPath(keys.slice(1))
    );
  };

  getAttributesByKeyPath: (keyPath: string | string[]) => TstprjAttribute[] = (
    keyPath
  ) => {
    const keys = typeof keyPath === "string" ? keyPath.split(".") : keyPath;
    if (keys.length === 1)
      return this.attributes.filter((attribute) => attribute.key === keys[0]);
    return this.children
      .filter((child) => child.key === keys[0])
      .flatMap((child) => child.getAttributesByKeyPath(keys.slice(1)));
  };
}

export abstract class TstprjAttribute {
  key: string;
  type: TstprjAttributeType;
  protected _value: string | number;
  parent: TstprjElement | null;
  serializeValue: () => Uint8Array;
  toXmlValue: (escape?: boolean) => string;

  constructor(
    key: string,
    value: string | number,
    parent?: TstprjElement | null
  ) {
    this.key = key;
    this._value = value;
    this.parent = parent ?? null;
  }

  serialize: () => Uint8Array = () => {
    const key = binarizeString(this.key);
    const value = this.serializeValue();
    const len = binarizeUint(value.byteLength + 1);
    const lenOflen = binarizeUint(len.byteLength);
    return concatBytes(key, 0x00, lenOflen, len, this.type, value);
  };

  toXml: (escape?: boolean) => string = (escape = false) => {
    return `${this.key}="${this.toXmlValue(escape)}"`;
  };

  get value() {
    return this._value;
  }
  set value(value: string | number) {
    this._value = value;
  }
}

export class TstprjInt extends TstprjAttribute {
  type = TSTPRJ_ATTRIBUTE_TYPE.int;

  constructor(key: string, value: number, parent?: TstprjElement | null) {
    super(key, value, parent ?? null);
  }

  serializeValue = () => {
    return binarizeInt(this.value);
  };

  toXmlValue = () => {
    return this.value.toString();
  };

  get value() {
    return this._value as number;
  }
  set value(value: number) {
    this._value = value;
  }
}

export class TstprjDouble extends TstprjAttribute {
  type = TSTPRJ_ATTRIBUTE_TYPE.double;

  constructor(key: string, value: number, parent?: TstprjElement | null) {
    super(key, value, parent ?? null);
  }

  serializeValue = () => {
    return binarizeDouble(this.value);
  };

  toXmlValue = () => {
    return this.value.toString();
  };

  get value() {
    return this._value as number;
  }
  set value(value: number) {
    this._value = value;
  }
}

export class TstprjString extends TstprjAttribute {
  type = TSTPRJ_ATTRIBUTE_TYPE.string;

  constructor(key: string, value: string, parent?: TstprjElement | null) {
    super(key, value, parent ?? null);
  }

  serializeValue = () => {
    return concatBytes(binarizeString(this.value), 0x00);
  };

  toXmlValue = (escape = false) => {
    if (!escape) return this.value;
    return this.value
      .replaceAll(`"`, "&quot;")
      .replaceAll("'", "&apos;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("&", "&amp;");
  };

  get value() {
    return this._value as string;
  }
  set value(value: string) {
    this._value = value;
  }
}

export class TstprjTsml extends TstprjString {
  tsml: TsmlElement | null = null;
  private _isParsing: boolean;
  private _isParsed: boolean;

  parseTsml: () => Promise<boolean> = async () => {
    if (this._isParsing) return false;
    try {
      this._isParsing = true;

      const parser = new DOMParser();
      const doc = parser.parseFromString(
        `<tsml>${this.value}</tsml>`,
        "text/xml"
      );
      const parsed = this.parseNode(doc, null).children[0];
      parsed.parent = null;
      this.tsml = parsed;

      this._isParsed = true;
      return true;
    } catch {
      this._isParsed = false;
      return false;
    } finally {
      this._isParsing = false;
    }
  };

  protected parseNode: (node: Node, parent: TsmlElement) => TsmlElement = (
    node,
    parent
  ) => {
    const element = this.newElement(node.nodeName, parent);
    if (node.nodeType === Node.TEXT_NODE) {
      element.key = "";
      element.value = node.nodeValue;
      return element;
    }
    if (node instanceof Element) {
      const attributes = node.attributes;
      if (attributes) {
        for (let i = 0; i < attributes.length; i++) {
          const attribute = attributes.item(i);
          if (attribute) {
            element.attributes.push(
              this.newAttribute(
                attribute.nodeName,
                attribute.nodeValue,
                element
              )
            );
          }
        }
      }
    }
    node.childNodes.forEach((child) => {
      element.children.push(this.parseNode(child, element));
    });
    return element;
  };

  protected newElement: (key: string, parent: TsmlElement) => TsmlElement = (
    key,
    parent
  ) => {
    return new TsmlElement({ key, parent });
  };

  protected newAttribute: (
    key: string,
    value: string,
    parent: TsmlElement
  ) => TsmlAttribute = (key, value, parent) => {
    return new TsmlAttribute(key, value, parent);
  };

  getElementsByKeyPath: (keyPath: string | string[]) => TsmlElement[] = (
    keyPath
  ) => {
    return this.tsml.getElementsByKeyPath(keyPath);
  };

  getAttributesByKeyPath: (keyPath: string | string[]) => TsmlAttribute[] = (
    keyPath
  ) => {
    return this.tsml.getAttributesByKeyPath(keyPath);
  };

  override serializeValue = () => {
    this.value = this.toXml();
    return concatBytes(binarizeString(this.value), 0x00);
  };

  override toXml: (escape?: boolean) => string = (escape = false) => {
    return this.tsml.toXml(escape).replaceAll(/(^<tsml>)|(<\/tsml>$)/g, "");
  };

  get isParsing() {
    return this._isParsing;
  }
  get isParsed() {
    return this._isParsed;
  }
}

export class TsmlElement {
  key: string;
  protected _value?: string;
  protected _parent: TsmlElement | null;
  protected _attributes: TsmlAttribute[];
  protected _children: TsmlElement[];

  constructor(props: {
    key: string;
    value?: string;
    parent?: TsmlElement | null;
    attributes?: TsmlAttribute[];
    children?: TsmlElement[];
  }) {
    this.key = props.key;
    this._value = props.value;
    this._parent = props.parent ?? null;
    this._attributes = props.attributes ?? [];
    this._children = props.children ?? [];
  }

  getElementsByKeyPath: (keyPath: string | string[]) => TsmlElement[] = (
    keyPath
  ) => {
    const keys = typeof keyPath === "string" ? keyPath.split(".") : keyPath;
    const children = this.children.filter((child) => child.key === keys[0]);
    if (keys.length === 1) return children;
    return children.flatMap((child) =>
      child.getElementsByKeyPath(keys.slice(1))
    );
  };

  getAttributesByKeyPath: (keyPath: string | string[]) => TsmlAttribute[] = (
    keyPath
  ) => {
    const keys = typeof keyPath === "string" ? keyPath.split(".") : keyPath;
    if (keys.length === 1)
      return this.attributes.filter((attribute) => attribute.key === keys[0]);
    return this.children
      .filter((child) => child.key === keys[0])
      .flatMap((child) => child.getAttributesByKeyPath(keys.slice(1)));
  };

  toXml: (escape?: boolean) => string = (escape = false) => {
    if (this.key === "") {
      if (!escape) return this.value;
      return this.value
        .replaceAll(`"`, "&quot;")
        .replaceAll("'", "&apos;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("&", "&amp;");
    }
    return `<${this.key}${
      this.attributes.length === 0
        ? ""
        : ` ${this.attributes.map((a) => a.toXml(escape)).join(" ")}`
    }${
      this.children.length === 0
        ? " />"
        : `>${this.children.map((c) => c.toXml(escape)).join("")}</${this.key}>`
    }`;
  };

  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
  }

  get parent() {
    return this._parent;
  }
  set parent(value) {
    this._parent = value;
  }

  get attributes() {
    return this._attributes;
  }
  set attributes(value) {
    this._attributes = value;
  }

  get children() {
    return this._children;
  }
  set children(value) {
    this._children = value;
  }
}

export class TsmlAttribute {
  key: string;
  protected _value: string;
  protected _parent: TsmlElement | null;

  constructor(key: string, value: string, parent?: TsmlElement | null) {
    this.key = key;
    this._value = value;
    this._parent = parent ?? null;
  }

  toXmlValue: (escape?: boolean) => string = (escape = false) => {
    if (!escape) return this.value;
    return this.value
      .replaceAll(`"`, "&quot;")
      .replaceAll("'", "&apos;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("&", "&amp;");
  };

  toXml: (escape?: boolean) => string = (escape = false) => {
    return `${this.key}="${this.toXmlValue(escape)}"`;
  };

  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
  }

  get parent() {
    return this._parent;
  }
  set parent(value) {
    this._parent = value;
  }
}
