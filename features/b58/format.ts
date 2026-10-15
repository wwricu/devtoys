/**
 * Base58 and Base58Check. The alphabet drops 0, I, l and O so codes survive
 * being read out loud or copied from a screenshot.
 */

export const BITCOIN_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const RIPPLE_ALPHABET =
  "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";

export function alphabetFor(name: string): string {
  return name === "ripple" ? RIPPLE_ALPHABET : BITCOIN_ALPHABET;
}

export function bytesToBase58(bytes: Uint8Array, letters: string): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = letters[0].repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += letters[digits[i]];
  return out;
}

export function base58ToBytes(
  text: string,
  letters: string,
): Uint8Array<ArrayBuffer> {
  const trimmed = text.trim();
  if (trimmed === "") return new Uint8Array(0);
  let zeros = 0;
  while (zeros < trimmed.length && trimmed[zeros] === letters[0]) zeros++;
  const bytes: number[] = [];
  for (let i = zeros; i < trimmed.length; i++) {
    const value = letters.indexOf(trimmed[i]);
    if (value < 0) throw new Error(`"${trimmed[i]}" is not a Base58 character`);
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++)
    out[zeros + i] = bytes[bytes.length - 1 - i];
  return out;
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return new Uint8Array(digest);
}

/** Base58Check: four checksum bytes from a double SHA-256 ride along. */
export async function encodeCheck(
  bytes: Uint8Array,
  letters: string,
): Promise<string> {
  const sum = await sha256(await sha256(bytes));
  const payload = new Uint8Array(bytes.length + 4);
  payload.set(bytes);
  payload.set(sum.subarray(0, 4), bytes.length);
  return bytesToBase58(payload, letters);
}

export async function decodeCheck(
  text: string,
  letters: string,
): Promise<Uint8Array> {
  const raw = base58ToBytes(text, letters);
  if (raw.length < 4)
    throw new Error("A Base58Check code needs at least four checksum bytes");
  const body = raw.subarray(0, raw.length - 4);
  const sum = await sha256(await sha256(body));
  for (let i = 0; i < 4; i++)
    if (sum[i] !== raw[body.length + i])
      throw new Error("Checksum does not match this payload");
  return body;
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.replace(/[\s:]/g, "");
  if (clean !== "" && !/^([0-9a-fA-F]{2})+$/.test(clean))
    throw new Error("Hex text needs pairs of hex digits");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return toHex(bytes);
}
