export interface Base64Options {
  urlSafe: boolean;
}

function normalize(input: string): string {
  // strip whitespace, map URL-safe alphabet, fix padding
  let s = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const mod = s.length % 4;
  if (mod === 2) s += "==";
  else if (mod === 3) s += "=";
  else if (mod === 1) throw new Error("Invalid Base64 length");
  return s;
}

export function encodeText(text: string, opts: Base64Options): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  let out = btoa(bin);
  if (opts.urlSafe) {
    out = out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return out;
}

export function decodeToText(b64: string): string {
  const bin = atob(normalize(b64));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

export function encodeHexToBase64(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  const bytes = Uint8Array.from(
    clean.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? []
  );
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
