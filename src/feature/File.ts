export const readFileAsArrayBuffer = (file: File) => {
  return new Promise<ArrayBufferLike>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        const encoder = new TextEncoder();
        resolve(encoder.encode(reader.result).buffer);
      }
      resolve(reader.result as ArrayBuffer);
    };

    reader.onerror = () => {
      reject(reader.error);
    };

    reader.readAsArrayBuffer(file);
  });
};

export const readFileAsText = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(reader.error);
    };

    reader.readAsText(file);
  });
};

export const downloadBinaryAsFile = (
  binary: Uint8Array,
  filename: string,
  mimeType: string = "application/octet-stream"
) => {
  const blob = new Blob([binary], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
