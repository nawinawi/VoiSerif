import { createSignal, Signal } from "solid-js";
import { createMutable } from "solid-js/store";
import {
  TsmlAttribute,
  TsmlElement,
  Tstprj,
  TSTPRJ_ATTRIBUTE_TYPE,
  TstprjAttribute,
  TstprjAttributeType,
  TstprjDouble,
  TstprjElement,
  TstprjInt,
  TstprjString,
  TstprjTsml,
} from "./TstprjBase";

export class TstprjSignal extends Tstprj {
  protected override newAttribute: (
    type: TstprjAttributeType,
    key: string,
    value: any,
    parent: TstprjElement
  ) => TstprjAttribute = (type, key, value, parent) => {
    switch (type) {
      case TSTPRJ_ATTRIBUTE_TYPE.int:
        return new TstprjIntSignal(key, value, parent);
      case TSTPRJ_ATTRIBUTE_TYPE.double:
        return new TstprjDoubleSignal(key, value, parent);
      case TSTPRJ_ATTRIBUTE_TYPE.string:
        switch (key) {
          case "tsml":
            return new TstprjTsmlSignal(key, value, parent);
          default:
            return new TstprjStringSignal(key, value, parent);
        }
    }
  };
}

export class TstprjIntSignal extends TstprjInt {
  signalValue: Signal<number>;

  constructor(key: string, value: number, parent?: TstprjElement | null) {
    super(key, value, parent ?? null);
    this.signalValue = createSignal(value);
  }

  override get value() {
    return this.signalValue[0]();
  }
  override set value(value: number) {
    this.signalValue[1](value);
  }
}

export class TstprjDoubleSignal extends TstprjDouble {
  signalValue: Signal<number>;

  constructor(key: string, value: number, parent?: TstprjElement | null) {
    super(key, value, parent ?? null);
    this.signalValue = createSignal(value);
  }

  override get value() {
    return this.signalValue[0]();
  }
  override set value(value: number) {
    this.signalValue[1](value);
  }
}

export class TstprjStringSignal extends TstprjString {
  signalValue: Signal<string>;

  constructor(key: string, value: string, parent?: TstprjElement | null) {
    super(key, value, parent ?? null);
    this.signalValue = createSignal(value);
  }

  override get value() {
    return this.signalValue[0]();
  }
  override set value(value: string) {
    this.signalValue[1](value);
  }
}

export class TstprjTsmlSignal extends TstprjTsml {
  signalValue: Signal<string>;

  constructor(key: string, value: string, parent?: TstprjElement | null) {
    super(key, value, parent ?? null);
    this.signalValue = createSignal(value);
  }

  override get value() {
    return this.signalValue[0]();
  }

  override set value(value: string) {
    this.signalValue[1](value);
  }

  protected override newElement: (
    key: string,
    parent: TsmlElement
  ) => TsmlElementSignal = (key, parent) => {
    return new TsmlElementSignal({ key, parent });
  };

  protected override newAttribute: (
    key: string,
    value: string,
    parent: TsmlElement
  ) => TsmlAttributeSignal = (key, value, parent) => {
    return new TsmlAttributeSignal(key, value, parent);
  };
}

export class TsmlElementSignal extends TsmlElement {
  signalParent: Signal<TsmlElement>;

  constructor(props: {
    key: string;
    parent?: TsmlElement | null;
    attributes?: TsmlAttribute[];
    children?: TsmlElement[];
  }) {
    super({
      ...props,
      attributes: createMutable(props.attributes ?? []),
      children: createMutable(props.children ?? []),
    });
    this.signalParent = createSignal(this._parent);
  }

  override get parent() {
    return this.signalParent[0]();
  }
  override set parent(value) {
    this.signalParent[1](value);
  }
}

export class TsmlAttributeSignal extends TsmlAttribute {
  signalValue: Signal<string>;
  signalParent: Signal<TsmlElement>;

  constructor(key: string, value: string, parent?: TsmlElement | null) {
    super(key, value, parent ?? null);
    this.signalValue = createSignal(value);
    this.signalParent = createSignal(parent ?? null);
  }

  override get value() {
    return this.signalValue[0]();
  }
  override set value(value) {
    this.signalValue[1](value);
  }

  override get parent() {
    return this.signalParent[0]();
  }
  override set parent(value) {
    this.signalParent[1](value);
  }
}
