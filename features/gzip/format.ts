export type CompressFormat = "gzip" | "deflate";
export type ByteEncoding = "base64" | "base64url" | "hex";

export function bytesToBase64(bytes: Uint8Array, variant: ByteEncoding = "base64"): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const std = btoa(bin);
  if (variant === "base64") return std;
  return std.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64ToBytes(text: string): Uint8Array<ArrayBuffer> {
  const cleaned = text.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

export function hexToBytes(text: string): Uint8Array<ArrayBuffer> {
  const cleaned = text.replace(/[\s:]/g, "");
  if (cleaned.length % 2 !== 0) throw new Error("Hex text must have an even number of digits");
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) throw new Error("Not valid hex text");
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

export async function compress(
  text: string,
  format: CompressFormat,
  encoding: ByteEncoding,
): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream(format));
  const out = await readStream(stream);
  return encoding === "hex" ? bytesToHex(out) : bytesToBase64(out, encoding);
}

export async function decompress(
  payload: string,
  format: CompressFormat,
  encoding: ByteEncoding,
): Promise<string> {
  let stream: ReadableStream<Uint8Array>;
  try {
    const bytes = encoding === "hex" ? hexToBytes(payload) : base64ToBytes(payload);
    stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
  } catch (err) {
    throw new Error(
      err instanceof Error && err.message.includes("hex")
        ? err.message
        : `Not valid Base64 or Hex ${format} data`,
    );
  }
  try {
    const out = await readStream(stream);
    return new TextDecoder().decode(out);
  } catch {
    throw new Error(`Not valid ${format} data`);
  }
}

/** Byte length of an encoded payload, for the size readout. */
export function encodedByteLength(payload: string, encoding: ByteEncoding): number {
  try {
    return encoding === "hex" ? hexToBytes(payload).length : base64ToBytes(payload).length;
  } catch {
    return 0;
  }
}
