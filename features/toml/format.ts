/**
 * TOML reader and writer. Covers the subset real files use: tables, arrays of
 * tables, dotted keys, inline tables, arrays across lines, the four string
 * forms, integers (decimal, hex, octal, binary), floats, booleans, dates kept
 * as text, and comments.
 */

export interface TomlReadResult {
  value: Record<string, unknown> | null;
  error: string | null;
}

type Table = Record<string, unknown>;

const BARE = /[A-Za-z0-9_-]/;

class Reader {
  private readonly source: string;
  private at = 0;
  line = 1;

  constructor(source: string) {
    this.source = source;
  }

  fail(message: string): never {
    throw new Error(`${message} (line ${this.line})`);
  }

  private rest(): string {
    return this.source.slice(this.at);
  }

  peek(offset = 0): string {
    return this.source[this.at + offset] ?? "";
  }

  private take(): string {
    const char = this.source[this.at] ?? "";
    this.at++;
    if (char === "\n") this.line++;
    return char;
  }

  skipSpaces(): void {
    while (this.peek() === " " || this.peek() === "\t") this.at++;
  }

  skipComment(): void {
    if (this.peek() !== "#") return;
    while (this.peek() !== "\n" && this.peek() !== "") this.take();
  }

  /** Whitespace, newlines and comments — everything between statements. */
  skipBlank(): void {
    for (;;) {
      const char = this.peek();
      if (char === " " || char === "\t" || char === "\n" || char === "\r") this.take();
      else if (char === "#") this.skipComment();
      else return;
    }
  }

  atEnd(): boolean {
    return this.peek() === "";
  }

  readKeyPart(): string {
    this.skipSpaces();
    const quote = this.peek();
    if (quote === '"' || quote === "'") return this.readString(quote === '"' ? "basic" : "literal");
    const start = this.at;
    while (BARE.test(this.peek()) && this.peek() !== "") this.take();
    if (this.at === start) this.fail("Expected a key");
    return this.source.slice(start, this.at);
  }

  readKeyPath(): string[] {
    const path: string[] = [];
    for (;;) {
      path.push(this.readKeyPart());
      this.skipSpaces();
      if (this.peek() !== ".") break;
      this.take();
    }
    return path;
  }

  readString(kind: "basic" | "literal" | "multiline-basic" | "multiline-literal"): string {
    const quote = kind === "basic" || kind === "multiline-basic" ? '"' : "'";
    const multiline = kind === "multiline-basic" || kind === "multiline-literal";
    const stop = multiline ? quote.repeat(3) : quote;
    if (!this.rest().startsWith(stop)) this.fail("Unbalanced quote");
    this.at += stop.length;
    if (multiline && this.peek() === "\n") this.take();
    let out = "";
    for (;;) {
      if (this.peek() === "") this.fail("Unterminated string");
      if (this.rest().startsWith(stop)) {
        this.at += stop.length;
        return out;
      }
      const char = this.take();
      if (char === "\n" && !multiline) this.fail("Newline inside a single-line string");
      if (multiline && char === "\r" && this.peek() === "\n") continue;
      if (char !== "\\" || kind === "literal" || kind === "multiline-literal") {
        out += char;
        continue;
      }
      // Escape sequence in a basic string.
      if (multiline && (this.peek() === "\n" || (this.peek() === "\r" && this.source[this.at + 1] === "\n"))) {
        while (this.peek() === "\n" || this.peek() === "\r" || this.peek() === " " || this.peek() === "\t")
          this.take();
        continue;
      }
      out += this.readEscape();
    }
  }

  private readEscape(): string {
    const char = this.take();
    const simple: Record<string, string> = {
      b: "\b",
      t: "\t",
      n: "\n",
      f: "\f",
      r: "\r",
      '"': '"',
      "\\": "\\",
    };
    if (char in simple) return simple[char];
    if (char === "u" || char === "U") {
      const width = char === "u" ? 4 : 8;
      let hex = "";
      for (let i = 0; i < width; i++) hex += this.take();
      if (!/^[0-9a-fA-F]+$/.test(hex)) this.fail("Bad unicode escape");
      const code = Number.parseInt(hex, 16);
      if (code > 0x10ffff) this.fail("Unicode escape out of range");
      return String.fromCodePoint(code);
    }
    return this.fail(`Unknown escape "\\${char}"`);
  }

  private readBareToken(): string {
    const start = this.at;
    while (!" \t\r\n,]}#".includes(this.peek()) && this.peek() !== "") this.take();
    return this.source.slice(start, this.at);
  }

  readValue(): unknown {
    this.skipSpaces();
    const char = this.peek();
    if (char === '"') {
      if (this.rest().startsWith('"""')) return this.readString("multiline-basic");
      return this.readString("basic");
    }
    if (char === "'") {
      if (this.rest().startsWith("'''")) return this.readString("multiline-literal");
      return this.readString("literal");
    }
    if (char === "[") return this.readArray();
    if (char === "{") return this.readInlineTable();
    if (char === "") return this.fail("Missing value");

    const token = this.readBareToken();
    if (token === "true") return true;
    if (token === "false") return false;
    return parseAtom(token, () => this.fail("Malformed value"));
  }

  private readArray(): unknown[] {
    this.take();
    const out: unknown[] = [];
    for (;;) {
      this.skipBlank();
      if (this.peek() === "]") {
        this.take();
        return out;
      }
      out.push(this.readValue());
      this.skipBlank();
      if (this.peek() === ",") {
        this.take();
        continue;
      }
      if (this.peek() === "]") {
        this.take();
        return out;
      }
      return this.fail("Expected , or ] in array");
    }
  }

  private readInlineTable(): Table {
    this.take();
    const out: Table = {};
    this.skipSpaces();
    if (this.peek() === "}") {
      this.take();
      return out;
    }
    for (;;) {
      const path = this.readKeyPath();
      this.skipSpaces();
      if (this.peek() !== "=") this.fail("Expected = in inline table");
      this.take();
      assign(out, path, this.readValue(), () => this.fail("Duplicate key"));
      this.skipSpaces();
      if (this.peek() === ",") {
        this.take();
        continue;
      }
      if (this.peek() === "}") {
        this.take();
        return out;
      }
      return this.fail("Expected , or } in inline table");
    }
  }

  readHeader(): { path: string[]; array: boolean } {
    if (this.peek() !== "[") this.fail("Expected [");
    this.take();
    const array = this.peek() === "[";
    if (array) this.take();
    const path = this.readKeyPath();
    this.skipSpaces();
    if (this.peek() !== "]" || (array && this.source[this.at + 1] !== "]"))
      this.fail("Unterminated table header");
    this.take();
    if (array) this.take();
    return { path, array };
  }

  parse(): Table {
    const root: Table = {};
    let current: Table = root;

    while (!this.atEnd()) {
      this.skipBlank();
      if (this.atEnd()) break;
      if (this.peek() === "[") {
        const { path, array } = this.readHeader();
        if (array) {
          const parent = walk(root, path.slice(0, -1), true, () => this.fail("Bad table path")) as Table;
          const name = path[path.length - 1];
          const list = (parent[name] ??= []) as unknown;
          if (!Array.isArray(list)) this.fail(`${path.join(".")} is not an array of tables`);
          const fresh: Table = {};
          (list as Table[]).push(fresh);
          current = fresh;
        } else {
          current = walk(root, path, true, () => this.fail("Cannot redefine table")) as Table;
        }
        continue;
      }
      const path = this.readKeyPath();
      this.skipSpaces();
      if (this.peek() !== "=") this.fail("Expected = after a key");
      this.take();
      const value = this.readValue();
      const parent = walk(current, path.slice(0, -1), true, () => this.fail("Bad key path")) as Table;
      const key = path[path.length - 1];
      if (isPlainTable(value)) {
        if (key in parent && !isPlainTable(parent[key]))
          this.fail(`Duplicate key ${path.join(".")}`);
        parent[key] = { ...(parent[key] as Table | undefined), ...value };
      } else {
        if (key in parent) this.fail(`Duplicate key ${path.join(".")}`);
        parent[key] = value;
      }
      this.skipSpaces();
      if (this.peek() !== "" && this.peek() !== "\n" && this.peek() !== "#" && this.peek() !== "\r")
        this.fail("Unexpected text after a value");
    }
    return root;
  }
}

function parseAtom(token: string, fail: () => never): unknown {
  if (/^[-+]?(inf|nan)$/.test(token)) return token;
  if (/^\d{4}-\d{2}-\d{2}([Tt ].*)?$/.test(token) || /^\d{2}:\d{2}:\d{2}/.test(token))
    return token.replace(" ", "T");
  const radix = /^0([xob])([0-9a-fA-F_]+)$/.exec(token);
  if (radix) {
    const digits = radix[2].replace(/_/g, "");
    const value = Number.parseInt(digits, radix[1] === "x" ? 16 : radix[1] === "o" ? 8 : 2);
    if (!Number.isNaN(value)) return value;
    return fail();
  }
  const clean = token.replace(/_/g, "");
  if (!/^[+-]?(\d[\d]*(\.\d[\d]*)?([eE][+-]?\d[\d]*)?|\.\d[\d]*)$/.test(clean)) return fail();
  const value = Number(clean);
  if (Number.isInteger(value) && !clean.includes(".") && !clean.includes("e"))
    return Math.abs(value) > Number.MAX_SAFE_INTEGER ? token : value;
  return value;
}

function walk(node: Table, path: string[], create: boolean, fail: () => never): unknown {
  let at: Table = node;
  for (const key of path) {
    const next = at[key];
    if (next === undefined) {
      if (!create) return fail();
      at[key] = {};
      at = at[key] as Table;
    } else if (Array.isArray(next)) {
      // An array of tables header addresses its most recent entry.
      const last = next[next.length - 1];
      if (isTable(last)) at = last;
      else fail();
    } else if (isTable(next)) {
      at = next;
    } else {
      fail();
    }
  }
  return at;
}

function isTable(value: unknown): value is Table {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assign(target: Table, path: string[], value: unknown, fail: () => never): void {
  const parent = walk(target, path.slice(0, -1), true, fail) as Table;
  const key = path[path.length - 1];
  if (key in parent) fail();
  parent[key] = value;
}

export function parseToml(text: string): TomlReadResult {
  try {
    return { value: new Reader(normalise(text)).parse(), error: null };
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : String(err) };
  }
}

function normalise(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/^﻿/, "");
}

/* ------------------------------------------------------------------ writer */

function isPlainTable(value: unknown): value is Table {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function quoteString(value: string): string {
  let out = '"';
  for (const char of value) {
    if (char === '"') out += '\\"';
    else if (char === "\\") out += "\\\\";
    else if (char === "\n") out += "\\n";
    else if (char === "\t") out += "\\t";
    else if (char === "\r") out += "\\r";
    else if (char < " ") out += `\\u${char.codePointAt(0)!.toString(16).padStart(4, "0")}`;
    else out += char;
  }
  return `${out}"`;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (!Number.isFinite(value)) return value > 0 ? "inf" : Number.isNaN(value) ? "nan" : "-inf";
  return String(value);
}

function scalar(value: unknown): string {
  if (typeof value === "string") return quoteString(value);
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return formatNumber(value);
  if (value === null || value === undefined) return '""';
  if (Array.isArray(value)) return `[${value.map(scalar).join(", ")}]`;
  if (isPlainTable(value))
    return `{ ${Object.entries(value)
      .map(([key, item]) => `${dotted(key)} = ${scalar(item)}`)
      .join(", ")} }`;
  return quoteString(String(value));
}

function hasTableItems(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some((item) => isPlainTable(item) && (needsTable(item) || Object.keys(item).length > 0))
  );
}

function needsTable(value: unknown): value is Table {
  if (!isPlainTable(value)) return false;
  return Object.values(value).some((item) => isPlainTable(item) || hasTableItems(item));
}

function needsArrayOfTables(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.some((item) => isPlainTable(item));
}

function dotted(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : quoteString(key);
}

function emit(target: Table, path: string[], lines: string[]): void {
  const tables: [string, unknown][] = [];
  const arrays: [string, unknown[]][] = [];
  for (const [key, value] of Object.entries(target)) {
    if (needsArrayOfTables(value)) arrays.push([key, value as unknown[]]);
    else if (needsTable(value)) tables.push([key, value]);
    else lines.push(`${dotted(key)} = ${scalar(value)}`);
  }

  for (const [key, value] of tables) {
    const next = [...path, key];
    lines.push("", `[${next.map(dotted).join(".")}]`);
    emit(value as Table, next, lines);
  }
  for (const [key, items] of arrays) {
    const next = [...path, key];
    for (const item of items) {
      lines.push("", `[[${next.map(dotted).join(".")}]]`);
      emit(item as Table, next, lines);
    }
  }
}

export function stringifyToml(value: unknown): string {
  if (!isPlainTable(value)) throw new Error("The top level of a TOML file must be a table");
  const lines: string[] = [];
  emit(value, [], lines);
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n/, "").trimEnd()}\n`;
}
