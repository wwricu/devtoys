export interface EscapeOptions {
  /** Escape non-ASCII characters as \\uXXXX */
  escapeUnicode: boolean;
  /** Wrap the escaped result in double quotes */
  wrapQuotes: boolean;
}

const SIMPLE: Record<string, string> = {
  '"': '\\"',
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
};

const UNESCAPE_MAP: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

function hex4(code: number): string {
  return "\\u" + code.toString(16).padStart(4, "0");
}

export function escapeString(text: string, opts: EscapeOptions): string {
  let out = "";
  for (const ch of text) {
    const simple = SIMPLE[ch];
    if (simple) {
      out += simple;
      continue;
    }
    const code = ch.codePointAt(0)!;
    if (code < 0x20) {
      out += hex4(code);
    } else if (opts.escapeUnicode && code > 0x7e) {
      // escape each UTF-16 code unit of the character
      for (let i = 0; i < ch.length; i++) out += hex4(ch.charCodeAt(i));
    } else {
      out += ch;
    }
  }
  return opts.wrapQuotes ? `"${out}"` : out;
}

export interface UnescapeResult {
  output: string;
  error: string | null;
}

export function unescapeString(text: string): UnescapeResult {
  let s = text;
  // strip a single pair of surrounding quotes if present
  if (
    s.length >= 2 &&
    ((s[0] === '"' && s[s.length - 1] === '"') ||
      (s[0] === "'" && s[s.length - 1] === "'"))
  ) {
    s = s.slice(1, -1);
  }
  let out = "";
  let error: string | null = null;
  const readHex = (count: number, i: number): number | null => {
    const digits = s.slice(i, i + count);
    if (digits.length < count || !/^[0-9a-fA-F]+$/.test(digits)) return null;
    return parseInt(digits, 16);
  };
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch !== "\\") {
      out += ch;
      i++;
      continue;
    }
    const next = s[i + 1];
    if (next === undefined) {
      error = "Trailing backslash at end of input";
      break;
    }
    if (next === "u") {
      // allow \uXXXX or \u{XXXXX}
      if (s[i + 2] === "{") {
        const close = s.indexOf("}", i + 3);
        const code = close === -1 ? null : readHex(close - (i + 3), i + 3);
        if (code === null) {
          error = `Invalid \\u{{...}} escape at index ${i}`;
          break;
        }
        out += String.fromCodePoint(code);
        i = close + 1;
        continue;
      }
      const code = readHex(4, i + 2);
      if (code === null) {
        error = `Invalid \\uXXXX escape at index ${i}`;
        break;
      }
      out += String.fromCharCode(code);
      i += 6;
      continue;
    }
    if (next === "x") {
      const code = readHex(2, i + 2);
      if (code === null) {
        error = `Invalid \\xXX escape at index ${i}`;
        break;
      }
      out += String.fromCharCode(code);
      i += 4;
      continue;
    }
    const mapped = UNESCAPE_MAP[next];
    if (mapped !== undefined) {
      out += mapped;
      i += 2;
      continue;
    }
    // unknown escape: keep the character as-is (lenient)
    out += next;
    i += 2;
  }
  return { output: out, error };
}
