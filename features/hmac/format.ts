export type Digest = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export function toHex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function keyBytes(secret: string, asHex: boolean): Promise<Uint8Array<ArrayBuffer>> {
  if (!asHex) return new TextEncoder().encode(secret);
  const cleaned = secret.replace(/[\s:]/g, "");
  if (!/^([0-9a-fA-F]{2})*$/.test(cleaned))
    throw new Error("The key is not valid hex (pairs of hex digits)");
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export interface HmacResult {
  hex: string;
  base64: string;
}

export async function hmacOf(
  secret: string,
  message: string,
  digest: Digest,
  secretIsHex = false,
): Promise<HmacResult> {
  const key = await crypto.subtle.importKey(
    "raw",
    await keyBytes(secret, secretIsHex),
    { name: "HMAC", hash: { name: digest } },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new Uint8Array(new TextEncoder().encode(message)),
  );
  const bytes = new Uint8Array(signature);
  return { hex: toHex(bytes), base64: toBase64(bytes) };
}

/** Webhook signatures often arrive as "sha256=<hex>"; strip common prefixes. */
export function normalizeSignature(value: string): string {
  return value
    .trim()
    .replace(/^[a-z0-9]+=/i, "")
    .replace(/^0x/i, "")
    .toLowerCase();
}
