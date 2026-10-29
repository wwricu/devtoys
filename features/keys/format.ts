/**
 * Key pairs and signatures through WebCrypto. Keys leave the browser only as
 * PEM text the user copies; nothing is sent anywhere.
 */

export type KeyAlgorithm = "RSA" | "EC";

export interface KeyPairRead {
  publicPem: string;
  privatePem: string;
  publicJwk: string;
  privateJwk: string;
  error: string | null;
}

const CURVES = ["P-256", "P-384", "P-521"] as const;
const RSA_MODULI = [2048, 3072, 4096] as const;

export const curveNames: string[] = [...CURVES];
export const rsaModuli: number[] = [...RSA_MODULI];

function subtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || !crypto.subtle)
    throw new Error("WebCrypto is not available in this browser context");
  return crypto.subtle;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let chunk = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    chunk += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(chunk);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const clean = text.replace(/[^A-Za-z0-9+/=]/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pem(label: string, body: string): string {
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

/** PEM body without its header, so a pasted block is accepted in any layout. */
function pemBody(text: string, label: string): string {
  const pattern = new RegExp(
    `-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`,
    "i",
  );
  const found = pattern.exec(text);
  return (found ? found[1] : text).replace(/\s+/g, "");
}

function importAlgorithm(
  name: KeyAlgorithm,
  sizeOrCurve: string,
): RsaHashedImportParams | EcKeyImportParams {
  return name === "RSA"
    ? { name: "RSASSA-PKCS1-v1_5", hash: signatureHash(name, sizeOrCurve) }
    : { name: "ECDSA", namedCurve: sizeOrCurve };
}

function signAlgorithm(
  name: KeyAlgorithm,
  sizeOrCurve: string,
): EcdsaParams | Algorithm {
  return name === "RSA"
    ? { name: "RSASSA-PKCS1-v1_5" }
    : { name: "ECDSA", hash: signatureHash(name, sizeOrCurve) };
}

export function signatureHash(
  algorithm: KeyAlgorithm,
  sizeOrCurve: string,
): string {
  if (algorithm === "EC")
    return sizeOrCurve === "P-521"
      ? "SHA-512"
      : sizeOrCurve === "P-384"
        ? "SHA-384"
        : "SHA-256";
  return sizeOrCurve === "4096"
    ? "SHA-512"
    : sizeOrCurve === "3072"
      ? "SHA-384"
      : "SHA-256";
}

export async function generateKeyPair(
  algorithm: KeyAlgorithm,
  sizeOrCurve: string,
): Promise<KeyPairRead> {
  try {
    const hash = signatureHash(algorithm, sizeOrCurve);
    const params: RsaHashedKeyGenParams | EcKeyGenParams =
      algorithm === "RSA"
        ? {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: Number(sizeOrCurve),
            publicExponent: new Uint8Array([1, 0, 1]),
            hash,
          }
        : { name: "ECDSA", namedCurve: sizeOrCurve };
    const pair = await subtle().generateKey(params, true, ["sign", "verify"]);
    const publicKey = await subtle().exportKey("spki", pair.publicKey);
    const privateKey = await subtle().exportKey("pkcs8", pair.privateKey);
    const publicJwk = await subtle().exportKey("jwk", pair.publicKey);
    const privateJwk = await subtle().exportKey("jwk", pair.privateKey);
    return {
      publicPem: pem("PUBLIC KEY", toBase64(publicKey)),
      privatePem: pem("PRIVATE KEY", toBase64(privateKey)),
      publicJwk: JSON.stringify(publicJwk, null, 2),
      privateJwk: JSON.stringify(privateJwk, null, 2),
      error: null,
    };
  } catch (err) {
    return emptyRead(err);
  }
}

function emptyRead(err: unknown): KeyPairRead {
  return {
    publicPem: "",
    privatePem: "",
    publicJwk: "",
    privateJwk: "",
    error: err instanceof Error ? err.message : String(err),
  };
}

/** Sign text with a PKCS#8 private key, returning base64. */
export async function signText(
  algorithm: KeyAlgorithm,
  sizeOrCurve: string,
  privatePem: string,
  message: string,
): Promise<{ signature: string; error: string | null }> {
  try {
    if (pemBody(privatePem, "PRIVATE KEY") === "")
      return { signature: "", error: "Paste a PKCS#8 private key in PEM form" };
    const key = await subtle().importKey(
      "pkcs8",
      fromBase64(pemBody(privatePem, "PRIVATE KEY")),
      importAlgorithm(algorithm, sizeOrCurve),
      false,
      ["sign"],
    );
    const signature = await subtle().sign(
      signAlgorithm(algorithm, sizeOrCurve),
      key,
      new TextEncoder().encode(message),
    );
    return { signature: toBase64(signature), error: null };
  } catch (err) {
    return {
      signature: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function verifyText(
  algorithm: KeyAlgorithm,
  sizeOrCurve: string,
  publicPem: string,
  message: string,
  signature: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    if (pemBody(publicPem, "PUBLIC KEY") === "")
      return {
        ok: false,
        error: "Paste a SubjectPublicKeyInfo public key in PEM form",
      };
    const key = await subtle().importKey(
      "spki",
      fromBase64(pemBody(publicPem, "PUBLIC KEY")),
      importAlgorithm(algorithm, sizeOrCurve),
      false,
      ["verify"],
    );
    const ok = await subtle().verify(
      signAlgorithm(algorithm, sizeOrCurve),
      key,
      fromBase64(signature),
      new TextEncoder().encode(message),
    );
    return { ok, error: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
