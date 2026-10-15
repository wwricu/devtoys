export function textToHex(text: string, separator: string): string {
  const bytes = new TextEncoder().encode(text);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(separator);
}

export function hexToText(hex: string): string {
  const clean = hex.replace(/[\s,:]/g, "");
  if (clean.length % 2 !== 0) throw new Error("Hex text needs an even number of digits");
  if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error("Only hex digits are accepted here");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** Escape forms commonly seen in source code and URLs. */
export function toEscapes(text: string): { x: string; u: string; b: string } {
  const bytes = new TextEncoder().encode(text);
  return {
    x: [...bytes].map((b) => `\\x${b.toString(16).padStart(2, "0")}`).join(""),
    u: [...text].map((c) => `\\u${c.codePointAt(0)!.toString(16).padStart(4, "0")}`).join(""),
    b: [...bytes].map((b) => b.toString(2).padStart(8, "0")).join(" "),
  };
}

/** UTF-8 byte view plus the code points behind them. */
export interface CharRow {
  char: string;
  codePoint: string;
  decimal: string;
  html: string;
  utf8: string;
}

export function charTable(text: string): CharRow[] {
  const out: CharRow[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    out.push({
      char: char === " " ? "␠" : char === "\n" ? "⏎" : char,
      codePoint: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
      decimal: String(cp),
      html: `&#${cp};`,
      utf8: [...new TextEncoder().encode(char)].map((b) => b.toString(16).padStart(2, "0")).join(" "),
    });
  }
  return out;
}
