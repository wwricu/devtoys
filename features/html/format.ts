export interface HtmlEncodeOptions {
  encodeNonAscii: boolean;
}

// Practical subset of named HTML entities
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  times: "×",
  divide: "÷",
  plusmn: "±",
  deg: "°",
  micro: "µ",
  middot: "·",
  bull: "•",
  dagger: "†",
  para: "¶",
  sect: "§",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  curren: "¤",
  larr: "←",
  rarr: "→",
  uarr: "↑",
  darr: "↓",
  harr: "↔",
  le: "≤",
  ge: "≥",
  ne: "≠",
  infin: "∞",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  pi: "π",
  sigma: "σ",
  omega: "ω",
  mu: "μ",
  sum: "∑",
  prod: "∏",
  radic: "√",
  sup2: "²",
  sup3: "³",
  frac12: "½",
};

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function encodeHtml(text: string, opts: HtmlEncodeOptions): string {
  let out = "";
  for (const ch of text) {
    const e = ESCAPE[ch];
    if (e) {
      out += e;
    } else if (opts.encodeNonAscii && ch.codePointAt(0)! > 0x7e) {
      out += `&#${ch.codePointAt(0)!};`;
    } else {
      out += ch;
    }
  }
  return out;
}

export function decodeHtml(text: string): string {
  return text.replace(
    /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, body: string) => {
      if (body[0] === "#") {
        const isHex = body[1] === "x" || body[1] === "X";
        const code = isHex
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
        return String.fromCodePoint(code);
      }
      const ch = NAMED[body];
      return ch !== undefined ? ch : match;
    }
  );
}
