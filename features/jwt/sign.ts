export type HmacAlg = "HS256" | "HS384" | "HS512";

const ALG_HASH: Record<HmacAlg, string> = {
  HS256: "SHA-256",
  HS384: "SHA-384",
  HS512: "SHA-512",
};

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function textToB64url(text: string): string {
  return bytesToB64url(new TextEncoder().encode(text));
}

function b64urlToBytes(part: string): Uint8Array {
  let s = part.replace(/-/g, "+").replace(/_/g, "/");
  const mod = s.length % 4;
  if (mod) s += "=".repeat(4 - mod);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(alg: HmacAlg, secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: ALG_HASH[alg] },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

/** Compact JSON from a pretty-printed editor buffer; throws a readable error. */
function minify(label: string, text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") throw new Error(`${label} is empty`);
  try {
    return JSON.stringify(JSON.parse(trimmed));
  } catch (err) {
    throw new Error(
      `${label} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export interface SignOptions {
  alg: HmacAlg;
  header: string;
  payload: string;
  secret: string;
}

export async function signJwt(opts: SignOptions): Promise<string> {
  const header = minify("Header", opts.header);
  const payload = minify("Payload", opts.payload);
  const data = `${textToB64url(header)}.${textToB64url(payload)}`;
  const sig = await hmac(opts.alg, opts.secret, data);
  return `${data}.${bytesToB64url(sig)}`;
}

export interface VerifyResult {
  verified: boolean;
  message: string;
  alg: string | null;
}

export async function verifyJwt(token: string, secret: string): Promise<VerifyResult> {
  const trimmed = token.trim().replace(/^Bearer\s+/i, "");
  const parts = trimmed.split(".");
  if (parts.length !== 3)
    return { verified: false, message: "Expected three dot-separated segments", alg: null };

  let alg: unknown;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    alg = header.alg;
  } catch {
    return { verified: false, message: "Header is not valid Base64URL JSON", alg: null };
  }

  if (typeof alg !== "string" || !(alg in ALG_HASH))
    return {
      verified: false,
      message: `Only HS256/HS384/HS512 can be verified here (token says ${String(alg)})`,
      alg: typeof alg === "string" ? alg : null,
    };

  const expected = await hmac(alg as HmacAlg, secret, `${parts[0]}.${parts[1]}`);
  const actual = b64urlToBytes(parts[2]);
  let diff = expected.length ^ actual.length;
  const len = Math.min(expected.length, actual.length);
  for (let i = 0; i < len; i++) diff |= expected[i] ^ actual[i];
  return {
    verified: diff === 0 && expected.length === actual.length,
    message: diff === 0 && expected.length === actual.length ? "Signature matches" : "Signature does not match",
    alg,
  };
}

export const HMAC_ALGS: HmacAlg[] = ["HS256", "HS384", "HS512"];
