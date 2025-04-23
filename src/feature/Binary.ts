const findBytes = (
  bytes: Uint8Array<ArrayBufferLike>,
  pattern: Uint8Array<ArrayBufferLike>,
  start: number = 0
): number => {
  const n = bytes.length;
  const m = pattern.length;

  if (m === 0) {
    return 0;
  }

  let i = start; // Index for bytes
  while (i <= n - m) {
    let j = 0;
    while (j < m && pattern[j] === bytes[i + j]) {
      j++;
    }

    if (j === m) {
      return i; // Match found
    }

    // Calculate the shift
    if (i + m < n) {
      const charAfter = bytes[i + m];
      let k = m - 1;
      while (k >= 0 && pattern[k] !== charAfter) {
        k--;
      }
      if (k < 0) {
        i += m + 1; // Character not in pattern, shift by m + 1
      } else {
        i += m - k; // Shift to align the rightmost occurrence
      }
    } else {
      break; // Pattern cannot fit further
    }
  }

  return -1; // Not found
};

export const findBytesByNumberArray = (
  bytes: Uint8Array<ArrayBufferLike>,
  pattern: number[],
  start: number = 0
): number => {
  return findBytes(bytes, new Uint8Array(pattern), start);
};

export const findBytesByString = (
  bytes: Uint8Array<ArrayBufferLike>,
  pattern: string,
  start: number = 0
): number => {
  const encoder = new TextEncoder();
  const search = encoder.encode(pattern);
  return findBytes(bytes, new Uint8Array(search), start);
};

export const findBytesByNumberAndString = (
  bytes: Uint8Array<ArrayBufferLike>,
  pattern: (number | string)[],
  start: number = 0
): number => {
  const result: number[] = [];
  const encoder = new TextEncoder();

  for (const item of pattern) {
    if (typeof item === "number") {
      if (item >= 0 && item <= 255 && Number.isInteger(item)) {
        result.push(item);
      } else {
        throw new Error("not uint8");
      }
    } else if (typeof item === "string") {
      const encodedBytes = encoder.encode(item);
      result.push(...Array.from(encodedBytes));
    } else {
      throw new Error("not uint8 or string");
    }
  }

  return findBytes(bytes, new Uint8Array(result), start);
};

export const parseLittleEndianUint = (bytes: Uint8Array<ArrayBufferLike>) => {
  let num = 0;
  bytes.forEach((v, i) => {
    num += v * 0x0100 ** i;
  });
  return num;
};

export const parseLittleEndianDouble = (bytes: Uint8Array<ArrayBufferLike>) => {
  if (bytes.length < 8) {
    throw new Error("not double");
  }
  const buffer = bytes.buffer;
  const byteOffset = bytes.byteOffset;
  const dataView = new DataView(buffer, byteOffset, bytes.byteLength);
  return dataView.getFloat64(0, true);
};

export const binarizeString = (text: string) => {
  const encoder = new TextEncoder();
  return encoder.encode(text);
};

export const binarizeUint = (num: number, isZeroEmpty: boolean = false) => {
  if (num < 0 || !Number.isInteger(num)) {
    throw new Error("not uint");
  }

  const bytes: number[] = [];
  let temp = num;

  while (temp > 0) {
    bytes.push(temp & 0xff); // 下位8ビットを取得
    temp >>= 8; // 8ビット右シフト
  }

  // 0 の場合は空の配列ではなく [0] を返す
  if (!isZeroEmpty && bytes.length === 0) {
    return new Uint8Array([0]);
  }

  return new Uint8Array(bytes);
};

export const binarizeInt = (num: number) => {
  if (!Number.isInteger(num)) {
    throw new Error("not int");
  }
  const buffer = new ArrayBuffer(4);
  const dataView = new DataView(buffer);
  dataView.setInt32(0, num, true);
  return new Uint8Array(buffer);
};

export const binarizeDouble = (num: number) => {
  const buffer = new ArrayBuffer(8);
  const dataView = new DataView(buffer);
  dataView.setFloat64(0, num, true);
  return new Uint8Array(buffer);
};

export const concatBytes = (...bytes: (number | Uint8Array)[]) => {
  const temp: Uint8Array[] = [];
  let length = 0;
  for (const item of bytes) {
    const binary = typeof item === "number" ? binarizeUint(item) : item;
    temp.push(binary);
    length += binary.length;
  }

  const result = new Uint8Array(length);
  let offset = 0;
  for (const item of temp) {
    result.set(item, offset);
    offset += item.length;
  }

  return result;
};
