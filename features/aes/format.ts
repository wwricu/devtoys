export type AesAlgorithm = "A128GCM" | "A256GCM";

const ITERATIONS = 150_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBytes(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

function fromBytes(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64ToBytes(text: string): Uint8Array<ArrayBuffer> {
  const cleaned = text.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(cleaned) && cleaned !== "")
    throw new Error("That is not Base64 text");
  const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
  let bin: string;
  try {
    bin = atob(padded);
  } catch {
    throw new Error("That is not Base64 text");
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(secret: string, salt: Uint8Array, algorithm: AesAlgorithm): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", toBytes(secret), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new Uint8Array(salt), iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: algorithm === "A128GCM" ? 128 : 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypts to Base64 over salt || iv || ciphertext. */
export async function encrypt(
  plaintext: string,
  secret: string,
  algorithm: AesAlgorithm,
): Promise<string> {
  if (secret === "") throw new Error("Enter a key");
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await derive(secret, salt, algorithm);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    toBytes(plaintext),
  );
  const body = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  body.set(salt, 0);
  body.set(iv, salt.length);
  body.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return bytesToBase64(body);
}

export async function decrypt(
  payload: string,
  secret: string,
  algorithm: AesAlgorithm,
): Promise<string> {
  if (secret === "") throw new Error("Enter a key");
  const body = base64ToBytes(payload);
  if (body.length < SALT_BYTES + IV_BYTES + 16)
    throw new Error("That payload is shorter than a salt, an IV and an auth tag");
  const salt = body.slice(0, SALT_BYTES);
  const iv = body.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = body.slice(SALT_BYTES + IV_BYTES);
  const key = await derive(secret, salt, algorithm);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      new Uint8Array(ciphertext) as Uint8Array<ArrayBuffer>,
    );
  } catch {
    throw new Error("Wrong key, wrong algorithm, or the payload was tampered with");
  }
  return fromBytes(new Uint8Array(plain));
}

export const ALGORITHMS: { value: AesAlgorithm; label: string }[] = [
  { value: "A256GCM", label: "AES-256-GCM" },
  { value: "A128GCM", label: "AES-128-GCM" },
];
