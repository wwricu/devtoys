export function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

export function readAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

export interface DecodedImage {
  mime: string;
  bytes: Uint8Array;
  uri: string;
}

/** Accepts a data URI, or bare Base64 (the bytes decide the type). */
export function decodeImageText(text: string): DecodedImage | string {
  const raw = text.trim();
  if (raw === "") return "Nothing to decode";

  let declaredMime = "";
  let body = raw;
  if (raw.startsWith("data:")) {
    const comma = raw.indexOf(",");
    if (comma < 0) return "The data URI has no comma";
    const header = raw.slice(0, comma);
    if (!/;base64/i.test(header)) return "Only Base64 data URIs are supported here";
    declaredMime = header.slice("data:".length).replace(/;base64/i, "").trim();
    body = raw.slice(comma + 1);
  }

  let bin: string;
  try {
    bin = atob(body.replace(/\s+/g, ""));
  } catch {
    return "Not valid Base64 text";
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const mime = declaredMime || sniff(bytes);
  return { mime, bytes, uri: `data:${mime};base64,${btoa(bin)}` };
}

function sniff(bytes: Uint8Array): string {
  if (bytes.length > 3 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.length > 11 && bytes[0] === 0x52 && bytes[8] === 0x57) return "image/webp";
  if (bytes.length > 3 && bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
  if (bytes.length > 1 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  return "application/octet-stream";
}
