const getElements = (node: Node, keyPath: string | string[]): Element[] => {
  const keys = typeof keyPath === "string" ? keyPath.split(".") : keyPath;
  if (keys.length > 0 && node.nodeName !== keys[0]) return [];
  if (node instanceof Element) {
    if (keys.length === 1) return [node];
    const nextKeys = keys.slice(1);
    return [...node.children].flatMap((n) => getElements(n, nextKeys));
  } else {
    return [];
  }
};

export const getElementsByKeyPath = (
  node: Node,
  keyPath: string | string[]
): Element[] => {
  return node instanceof Element || node instanceof Document
    ? [...node.children].flatMap((n) => getElements(n, keyPath))
    : [];
};

const getAttributes = (node: Node, keyPath: string | string[]): Attr[] => {
  const keys = typeof keyPath === "string" ? keyPath.split(".") : keyPath;
  if (keys.length > 0 && node.nodeName !== keys[0]) return [];
  if (node instanceof Attr && keys.length === 1) return [node];
  if (node instanceof Element) {
    if (keys.length < 2) {
      return [];
    }
    const nextKeys = keys.slice(1);
    return [...node.childNodes].flatMap((n) => getAttributes(n, nextKeys));
  } else {
    return [];
  }
};

export const getAttributesByKeyPath = (
  node: Node,
  keyPath: string | string[]
): Attr[] => {
  const keys = typeof keyPath === "string" ? keyPath.split(".") : keyPath;
  return node instanceof Element
    ? (keys.length > 1 ? [...node.children] : [...node.attributes]).flatMap(
        (n: Node) => getAttributes(n, keys)
      )
    : [];
};
