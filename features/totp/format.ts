export interface TotpOptions {
  secret: string;
  digits: number;
  period: number;
  algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  counter?: number;
  at?: number;
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 Base32 -> bytes, tolerant of spaces, dashes and missing padding. */
export function base32ToBytes(secret: string): Uint8Array<ArrayBuffer> {
  const clean = secret.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  if (clean === "") throw new Error("Enter a Base32 secret");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) throw new Error(`"${char}" is not a Base32 character`);
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 255);
    }
  }
  return new Uint8Array(bytes);
}

export function bytesToBase32(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32_ALPHABET[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

async function hmacBytes(secret: Uint8Array, message: Uint8Array, algorithm: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(secret) as Uint8Array<ArrayBuffer>,
    { name: "HMAC", hash: { name: algorithm } },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new Uint8Array(message));
  return new Uint8Array(signature);
}

/** RFC 4226 HOTP: dynamic truncation of an HMAC over the 8-byte counter. */
export async function hotp(options: TotpOptions, counter: number): Promise<string> {
  const bytes = base32ToBytes(options.secret);
  const message = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i--) {
    message[i] = value & 255;
    value = Math.floor(value / 256);
  }
  const digest = await hmacBytes(bytes, message, options.algorithm);
  const offset = digest[digest.length - 1] & 15;
  const binary =
    ((digest[offset] & 127) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 10 ** options.digits).padStart(options.digits, "0");
}

export interface TotpCode {
  code: string;
  counter: number;
  secondsLeft: number;
}

export async function totp(options: TotpOptions): Promise<TotpCode> {
  const at = options.at ?? Date.now();
  const counter = Math.floor(at / 1000 / options.period);
  const code = await hotp(options, counter);
  return { code, counter, secondsLeft: options.period - Math.floor((at / 1000) % options.period) };
}

/** Returns the counter that produced `code`, or null when it matches none. */
export async function verifyTotp(
  options: TotpOptions,
  code: string,
  steps = 1,
): Promise<number | null> {
  const at = options.at ?? Date.now();
  const current = Math.floor(at / 1000 / options.period);
  for (let drift = -steps; drift <= steps; drift++) {
    if ((await hotp(options, current + drift)) === code.trim()) return current + drift;
  }
  return null;
}

/** otpauth:// URI as QR-encoded by authenticator apps. */
export function otpauthUri(input: {
  label: string;
  issuer: string;
  options: TotpOptions;
}): string {
  const params = new URLSearchParams({
    secret: input.options.secret.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, ""),
    digits: String(input.options.digits),
    period: String(input.options.period),
    algorithm: input.options.algorithm,
  });
  const issuer = encodeURIComponent(input.issuer || input.label);
  const label = encodeURIComponent(input.label || input.issuer);
  return `otpauth://totp/${issuer}:${label}?${params.toString()}`;
}
