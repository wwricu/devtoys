import type { Indent } from "@/components/kit";

export type SortKeys = "none" | "asc" | "desc";

export interface JsonOptions {
  indent: Indent;
  sortKeys: SortKeys;
  /** Emit the input as a JSON string literal instead of parsing it. */
  escapeString: boolean;
}

export interface JsonError {
  message: string;
  line: number;
  column: number;
}

export interface JsonResult {
  output: string;
  error: JsonError | null;
  /** All syntax errors (only present on failure) */
  errors?: JsonError[];
}

function lineColumnAt(text: string, position: number) {
  let line = 1;
  let column = 1;
  const limit = Math.min(position, text.length);
  for (let i = 0; i < limit; i++) {
    if (text[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

function parseErrorFromException(text: string, err: unknown): JsonError {
  const message = err instanceof Error ? err.message : String(err);
  const direct = message.match(/line (\d+) column (\d+)/);
  if (direct) {
    return {
      message: message.replace(/^JSON\.parse:?\s*/i, ""),
      line: Number(direct[1]),
      column: Number(direct[2]),
    };
  }
  const at = message.match(/at position (\d+)/);
  const pos = at ? Number(at[1]) : 0;
  const { line, column } = lineColumnAt(text, pos);
  return { message: message.replace(/^JSON\.parse:?\s*/i, ""), line, column };
}

function sortValue(value: unknown, order: SortKeys): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => sortValue(v, order));
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => (order === "asc" ? a.localeCompare(b) : b.localeCompare(a))
    );
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) out[k] = sortValue(v, order);
    return out;
  }
  return value;
}

export function processJson(text: string, options: JsonOptions): JsonResult {
  if (options.escapeString)
    return { output: text === "" ? "" : JSON.stringify(text), error: null };
  if (text.trim() === "") return { output: "", error: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const errors = validateAll(text);
    const error = errors[0] ?? parseErrorFromException(text, err);
    return { output: "", error, errors: errors.length > 0 ? errors : [error] };
  }
  const sorted =
    options.sortKeys === "none" ? parsed : sortValue(parsed, options.sortKeys);
  const indentChar =
    options.indent === "tab"
      ? "\t"
      : options.indent === "none"
        ? undefined
        : Number(options.indent);
  const output = JSON.stringify(sorted, null, indentChar) ?? "null";
  return { output, error: null };
}

const WS = /[ \t\n\r\f\v]/;
const LITERAL_RE = /^(true|false|null)(?![A-Za-z0-9_-])/;
const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;

/**
 * Standalone scanner/parser: collects every syntax error with line/column.
 * JSON.parse only reports the first error, so this fills in the rest on failure.
 */
export function validateAll(text: string): JsonError[] {
  const errors: JsonError[] = [];
  let pos = 0;

  const fail = (message: string, at = pos) => {
    if (errors.length >= 50) return;
    const { line, column } = lineColumnAt(text, at);
    errors.push({ message, line, column });
  };

  const skipWs = () => {
    while (pos < text.length && WS.test(text[pos])) pos++;
  };

  const parseString = () => {
    const start = pos;
    pos++; // skip opening quote
    while (pos < text.length) {
      const ch = text[pos];
      if (ch === "\\") {
        pos += 2;
        continue;
      }
      if (ch === '"') {
        pos++;
        return;
      }
      if (ch === "\n") break;
      pos++;
    }
    fail("Unterminated string", start);
    pos = Math.min(text.length, start + 1);
    // recover to end of line to avoid cascading errors
    while (pos < text.length && text[pos] !== "\n") pos++;
  };

  const skipContainerRest = (closing: string) => {
    // after an error, jump to the next ',' or the container's closing token
    while (pos < text.length) {
      const ch = text[pos];
      if (ch === "," || ch === closing) {
        if (ch === ",") pos++;
        return;
      }
      if (ch === '"') {
        parseString();
        continue;
      }
      pos++;
    }
  };

  const parseValue = (inArray: boolean, closing: string): boolean => {
    skipWs();
    const ch = text[pos];
    if (ch === undefined) {
      fail("Missing value: text ended unexpectedly");
      return false;
    }
    if (ch === '"') {
      parseString();
      return true;
    }
    if (ch === "{") return parseObject();
    if (ch === "[") return parseArray();
    const literal = LITERAL_RE.exec(text.slice(pos));
    if (literal) {
      pos += literal[1].length;
      return true;
    }
    const num = NUMBER_RE.exec(text.slice(pos));
    if (num && (ch === "-" || (ch >= "0" && ch <= "9"))) {
      pos += num[0].length;
      return true;
    }
    fail(
      `Unexpected character '${ch}' (expected a string, number, object, array, true/false/null)`
    );
    if (inArray) skipContainerRest(closing);
    return false;
  };

  function parseObject(): boolean {
    const start = pos;
    pos++; // '{'
    skipWs();
    if (text[pos] === "}") {
      pos++;
      return true;
    }
    let ok = true;
    while (pos < text.length) {
      skipWs();
      const before = pos;
      if (text[pos] !== '"') {
        fail("Object keys must be strings", pos);
        ok = false;
        skipContainerRest("}");
        if (pos === before) pos++;
        if (text[pos - 1] === "}") return ok;
        if (pos >= text.length || text[pos] === "}") {
          if (text[pos] === "}") pos++;
          return ok;
        }
        continue;
      }
      parseString();
      skipWs();
      if (text[pos] !== ":") {
        fail("Missing ':' after key", pos);
        ok = false;
      } else {
        pos++;
        const valueOk = parseValue(false, "}");
        if (!valueOk) {
          ok = false;
          skipContainerRest("}");
        }
      }
      skipWs();
      if (pos >= text.length) break;
      if (text[pos] === ",") {
        pos++;
        skipWs();
        if (text[pos] === "}") {
          fail("Trailing comma in object", pos);
          ok = false;
          pos++;
          return ok;
        }
        continue;
      }
      if (text[pos] === "}") {
        pos++;
        return ok;
      }
      fail("Missing '}' for object", start);
      return false;
    }
    fail("Unterminated object", start);
    return ok && false;
  }

  function parseArray(): boolean {
    const start = pos;
    pos++; // '['
    skipWs();
    if (text[pos] === "]") {
      pos++;
      return true;
    }
    let ok = true;
    while (pos < text.length) {
      if (!parseValue(true, "]")) {
        ok = false;
      }
      skipWs();
      if (pos >= text.length) break;
      if (text[pos] === ",") {
        pos++;
        skipWs();
        if (text[pos] === "]") {
          fail("Trailing comma in array", pos);
          ok = false;
          pos++;
          return ok;
        }
        continue;
      }
      if (text[pos] === "]") {
        pos++;
        return ok;
      }
      fail("Missing ']' for array", start);
      return false;
    }
    fail("Unterminated array", start);
    return ok;
  }

  skipWs();
  if (pos >= text.length) return errors;
  parseValue(false, "");
  skipWs();
  if (pos < text.length) {
    fail("Unexpected content after end of document", pos);
  }
  return errors;
}
