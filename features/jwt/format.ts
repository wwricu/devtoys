export interface JwtPart {
  raw: string;
  json: string | null;
  data: Record<string, unknown> | null;
}

export interface JwtResult {
  header: JwtPart | null;
  payload: JwtPart | null;
  signature: string | null;
  error: string | null;
}

function b64urlDecode(part: string): string {
  let s = part.replace(/-/g, "+").replace(/_/g, "/");
  const mod = s.length % 4;
  if (mod) s += "=".repeat(4 - mod);
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function toPart(raw: string): JwtPart {
  try {
    const json = b64urlDecode(raw);
    const data = JSON.parse(json);
    return { raw, json: JSON.stringify(data, null, 2), data };
  } catch {
    return { raw, json: null, data: null };
  }
}

export function decodeJwt(token: string): JwtResult {
  const trimmed = token.trim().replace(/^Bearer\s+/i, "");
  if (trimmed === "")
    return { header: null, payload: null, signature: null, error: null };
  const parts = trimmed.split(".");
  if (parts.length < 2 || parts.length > 3) {
    return {
      header: null,
      payload: null,
      signature: null,
      error: "A JWT must have 2–3 dot-separated segments",
    };
  }
  const header = toPart(parts[0]);
  const payload = toPart(parts[1]);
  if (!header.data || !payload.data) {
    return {
      header,
      payload,
      signature: parts[2] ?? null,
      error: "Header/payload are not valid Base64URL-encoded JSON",
    };
  }
  return { header, payload, signature: parts[2] ?? null, error: null };
}

export const NUMERIC_CLAIMS = ["exp", "nbf", "iat"];

export function claimDate(value: unknown): string | null {
  if (typeof value === "number") {
    const d = new Date(value * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}
