export class YamlError extends Error {
  constructor(
    message: string,
    public line: number,
  ) {
    super(message);
  }
}

interface Line {
  indent: number;
  text: string;
  raw: string;
  no: number;
}

function stripComment(text: string): string {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "#" && (i === 0 || /\s/.test(text[i - 1])))
      return text.slice(0, i).trimEnd();
  }
  return text;
}

function toLines(src: string): Line[] {
  const out: Line[] = [];
  const rows = src.split(/\r?\n/);
  rows.forEach((rawRow, idx) => {
    const text = stripComment(rawRow);
    if (text.trim() === "") return;
    const indent = text.length - text.trimStart().length;
    out.push({ indent, text: text.trim(), raw: rawRow, no: idx + 1 });
  });
  return out;
}

function parseScalarToken(token: string, line: number): unknown {
  const t = token.trim();
  if (t === "") return null;
  const open = t[0];
  if ((open === '"' || open === "'") && !(t.length >= 2 && t.endsWith(open)))
    throw new YamlError(`Unterminated ${open === '"' ? "double" : "single"}-quoted scalar`, line);
  if (open === '"' && t.length >= 2) return unescapeDouble(t.slice(1, -1), line);
  if (open === "'" && t.length >= 2) return t.slice(1, -1).replace(/''/g, "'");
  if (t === "null" || t === "~") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^[-+]?\d+$/.test(t)) return Number(t);
  if (/^[-+]?(0x[0-9a-fA-F]+|\d*\.\d+([eE][-+]?\d+)?|\d+[eE][-+]?\d+)$/.test(t))
    return Number(t);
  if (t.startsWith("[") || t.startsWith("{")) return parseFlow(t, line);
  return t;
}

function unescapeDouble(body: string, line: number): string {
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = body[++i];
    const map: Record<string, string> = { n: "\n", t: "\t", r: "\r", '"': '"', "\\": "\\", "0": "\0" };
    if (next === undefined) throw new YamlError("Dangling escape at end of string", line);
    if (next === "u") {
      const hex = body.slice(i + 1, i + 5);
      if (!/^[0-9a-fA-F]{4}$/.test(hex))
        throw new YamlError("Bad \\u escape", line);
      out += String.fromCharCode(parseInt(hex, 16));
      i += 4;
    } else out += map[next] ?? next;
  }
  return out;
}

/* Minimal flow (JSON-like) parser for inline [..] and {..} values. */
function parseFlow(text: string, line: number): unknown {
  let pos = 0;
  const src = text;

  const ws = () => {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
  };
  const fail = (msg: string): never => {
    throw new YamlError(`In inline value: ${msg}`, line);
  };

  function value(): unknown {
    ws();
    const ch = src[pos];
    if (ch === "[") return array();
    if (ch === "{") return object();
    if (ch === '"' || ch === "'") return quoted(ch);
    let end = pos;
    while (end < src.length && !",]}".includes(src[end])) end++;
    const token = src.slice(pos, end).trim();
    pos = end;
    if (token === "") fail("empty value");
    return parseScalarToken(token, line);
  }

  function quoted(quote: string): string {
    let out = "";
    pos++;
    while (pos < src.length) {
      const ch = src[pos];
      if (quote === '"' && ch === "\\") {
        out += unescapeDouble(src.slice(pos, pos + 2).replace(/^\\/, ""), line);
        pos += 2;
        continue;
      }
      if (ch === quote) {
        if (src[pos + 1] === quote && quote === "'") {
          out += "'";
          pos += 2;
          continue;
        }
        pos++;
        return out;
      }
      out += ch;
      pos++;
    }
    return fail("unterminated quoted string");
  }

  function array(): unknown[] {
    pos++;
    const items: unknown[] = [];
    ws();
    if (src[pos] === "]") {
      pos++;
      return items;
    }
    for (;;) {
      items.push(value());
      ws();
      if (src[pos] === ",") {
        pos++;
        continue;
      }
      if (src[pos] === "]") {
        pos++;
        return items;
      }
      return fail("expected ',' or ']'");
    }
  }

  function object(): Record<string, unknown> {
    pos++;
    const out: Record<string, unknown> = {};
    ws();
    if (src[pos] === "}") {
      pos++;
      return out;
    }
    for (;;) {
      ws();
      const keyToken = (() => {
        const ch = src[pos];
        if (ch === '"' || ch === "'") return quoted(ch);
        let end = pos;
        while (end < src.length && src[end] !== ":") end++;
        const t = src.slice(pos, end).trim();
        pos = end;
        return t;
      })();
      ws();
      if (src[pos] !== ":") fail("expected ':' after a key");
      pos++;
      out[String(keyToken)] = value();
      ws();
      if (src[pos] === ",") {
        pos++;
        continue;
      }
      if (src[pos] === "}") {
        pos++;
        return out;
      }
      return fail("expected ',' or '}'");
    }
  }

  const result = value();
  ws();
  if (pos < src.length) fail("trailing characters");
  return result;
}

/** Split `key: value` on the first top-level colon; null when the line is not a mapping entry. */
function splitKey(text: string): [string, string] | null {
  let quote: string | null = null;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") depth--;
    else if (ch === ":" && depth === 0 && (i === text.length - 1 || text[i + 1] === " "))
      return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
  }
  return null;
}

function blockScalar(indicator: string, children: Line[]): string {
  const fold = indicator.startsWith(">");
  const chomp = indicator.includes("-")
    ? "strip"
    : indicator.includes("+")
      ? "keep"
      : "clip";
  const strip = Math.min(...children.map((c) => c.indent));
  const rows = children.map((c) => c.raw.slice(strip).replace(/\t/g, "    "));
  let joined: string;
  if (fold) {
    joined = "";
    for (const row of rows) {
      if (joined === "") joined = row;
      else if (row.trim() === "" || joined.endsWith(" ")) joined += "\n" + row;
      else joined += " " + row.trim();
    }
  } else {
    joined = rows.join("\n");
  }
  if (chomp === "strip") return joined.replace(/\s+$/, "");
  if (chomp === "clip") return joined.replace(/\s+$/, "") + "\n";
  return joined;
}

function parseLines(lines: Line[]): unknown {
  const base = lines[0].indent;
  const first = lines[0].text;

  if (first === "-" || first.startsWith("- ") || /^-[^\s]/.test(first))
    return parseSeq(lines, base);
  return parseMap(lines, base);
}

function parseSeq(lines: Line[], base: number): unknown[] {
  const out: unknown[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < base)
      throw new YamlError("Unexpected indentation", line.no);
    if (line.indent > base)
      throw new YamlError("Sequence items must line up at the same indent", line.no);
    if (!/^-($|\s)/.test(line.text))
      throw new YamlError("Expected a '- ' item", line.no);

    const rest = line.text.slice(1).trim();
    let j = i + 1;
    while (j < lines.length && lines[j].indent > base) j++;
    const children = lines.slice(i + 1, j);

    if (rest === "") {
      if (children.length === 0) out.push(null);
      else out.push(parseLines(children));
    } else {
      const afterDash = line.text.slice(1);
      const spaces = afterDash.length - afterDash.trimStart().length;
      const virtual = line.indent + 1 + Math.max(spaces, 1);
      const shifted: Line = {
        indent: virtual,
        text: rest,
        raw: " ".repeat(virtual) + rest,
        no: line.no,
      };
      const item = [shifted, ...children];
      if (splitKey(rest) !== null) out.push(parseMap(item, virtual));
      else if (/^-($|\s)/.test(rest)) out.push(parseSeq(item, virtual));
      else out.push(parseItemScalar(item));
    }
    i = j;
  }
  return out;
}

function parseItemScalar(item: Line[]): unknown {
  const [head, ...rest] = item;
  if (rest.length > 0)
    throw new YamlError("Nested data under a scalar item is not supported", rest[0].no);
  return parseScalarToken(head.text, head.no);
}

function parseMap(lines: Line[], base: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < base)
      throw new YamlError("Unexpected indentation", line.no);
    if (line.indent > base)
      throw new YamlError("Mapping entries must line up at the same indent", line.no);
    if (/^-($|\s)/.test(line.text))
      throw new YamlError("Expected 'key: value', found a sequence item", line.no);

    const pair = splitKey(line.text);
    if (!pair) throw new YamlError(`Expected 'key: value', got '${line.text}'`, line.no);
    const [rawKey, valueText] = pair;
    const key = String(parseScalarToken(rawKey, line.no));

    let j = i + 1;
    while (j < lines.length && lines[j].indent > base) j++;
    const children = lines.slice(i + 1, j);

    if (valueText === "") {
      out[key] = children.length === 0 ? null : parseLines(children);
    } else if (/^[|>][-+]?[0-9]*$/.test(valueText)) {
      if (children.length === 0)
        throw new YamlError("Block scalar has no content", line.no);
      out[key] = blockScalar(valueText, children);
    } else {
      if (children.length > 0)
        throw new YamlError(
          `Unexpected nested data under '${key}'`,
          children[0].no,
        );
      out[key] = parseScalarToken(valueText, line.no);
    }
    i = j;
  }
  return out;
}

export interface YamlParseResult {
  value: unknown;
  error: string | null;
  line: number;
}

export function parseYaml(src: string): YamlParseResult {
  const fail = (message: string, line: number): YamlParseResult => ({
    value: null,
    error: message,
    line,
  });
  if (src.trim() === "") return { value: null, error: null, line: 1 };

  const docSplit = src.split(/\r?\n/);
  const docs: string[] = [];
  let current: string[] = [];
  for (const row of docSplit) {
    if (/^---(\s|$)/.test(row)) {
      if (current.some((r) => r.trim() !== "")) docs.push(current.join("\n"));
      current = [];
      continue;
    }
    current.push(row);
  }
  if (current.some((r) => r.trim() !== "")) docs.push(current.join("\n"));

  const values: unknown[] = [];
  for (const doc of docs) {
    const lines = toLines(doc);
    if (lines.length === 0) continue;
    try {
      values.push(parseLines(lines));
    } catch (err) {
      if (err instanceof YamlError) return fail(err.message, err.line);
      return fail(err instanceof Error ? err.message : String(err), lines[0].no);
    }
  }
  if (values.length === 0) return fail("Nothing to parse", 1);
  const value = values.length === 1 ? values[0] : values;
  return { value, error: null, line: 1 };
}
