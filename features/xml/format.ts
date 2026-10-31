import type { Indent } from "@/components/kit";
import { unescapeString } from "@/features/escape/format";

export interface XmlOptions {
  indent: Indent;
  /** Keep comments in the output */
  preserveComments: boolean;
  /** Unescape the input and use the result as the XML source */
  unescape: boolean;
}

export interface XmlError {
  message: string;
  line: number;
  column: number;
}

export interface XmlResult {
  output: string;
  error: XmlError | null;
}

export type XmlNode =
  | { type: "element"; name: string; attrs: [string, string][]; selfClosing: boolean; children: XmlNode[] }
  | { type: "text"; value: string }
  | { type: "comment"; value: string }
  | { type: "cdata"; value: string }
  | { type: "decl"; value: string }
  | { type: "pi"; target: string; value: string }
  | { type: "doctype"; value: string };

class SyntaxError_ extends Error {
  constructor(message: string, public offset: number) {
    super(message);
  }
}

/** Parse XML into a node tree; any syntax problem throws with an offset */
export function parseXml(src: string): XmlNode[] {
  let pos = 0;
  const n = src.length;

  function err(message: string, at: number = pos): never {
    throw new SyntaxError_(message, at);
  }

  const expectName = (): string => {
    const m = /^[A-Za-z_:][\w.:-]*/.exec(src.slice(pos));
    if (!m) err("Expected an element/attribute name");
    pos += m![0].length;
    return m![0];
  };

  const skipWs = () => {
    while (pos < n && /[\s]/.test(src[pos])) pos++;
  };

  function parseAttributes(): [string, string][] {
    const attrs: [string, string][] = [];
    for (;;) {
      skipWs();
      const ch = src[pos];
      if (ch === ">" || ch === "/" || ch === undefined) return attrs;
      const name = expectName();
      skipWs();
      if (src[pos] !== "=") err(`Attribute '${name}' is missing '='`);
      pos++;
      skipWs();
      const quote = src[pos];
      if (quote !== '"' && quote !== "'")
        err(`The value of attribute '${name}' must be quoted`);
      pos++;
      const end = src.indexOf(quote, pos);
      if (end === -1 || src.slice(pos, end).includes("<"))
        err(`Unterminated quote for attribute '${name}'`, pos - 1);
      attrs.push([name, src.slice(pos, end)]);
      pos = end + 1;
    }
  }

  /** Parse content starting with '<!': comment / CDATA / DOCTYPE / entity decl */
  function parseBang(): XmlNode | null {
    // '<!' already confirmed
    if (src.startsWith("<!--", pos)) {
      const start = pos;
      pos += 4;
      const end = src.indexOf("-->", pos);
      if (end === -1) err("Unterminated comment '-->'", start);
      const value = src.slice(start + 4, end);
      if (value.includes("--")) err("Comments must not contain '--'", start);
      pos = end + 3;
      return { type: "comment", value };
    }
    if (src.startsWith("<![CDATA[", pos)) {
      const start = pos;
      pos += 9;
      const end = src.indexOf("]]>", pos);
      if (end === -1) err("Unterminated CDATA ']]>'", start);
      const value = src.slice(start + 9, end);
      pos = end + 3;
      return { type: "cdata", value };
    }
    // DOCTYPE / other DTD declarations: handle quotes and internal subsets '[' ... ']'
    const start = pos;
    pos += 2;
    let inBracket = false;
    let quote: string | null = null;
    while (pos < n) {
      const ch = src[pos];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "[") inBracket = true;
      else if (ch === "]") inBracket = false;
      else if (ch === ">" && !inBracket) {
        pos++;
        return { type: "doctype", value: src.slice(start, pos) };
      }
      pos++;
    }
    err("Unterminated DOCTYPE", start);
  }

  function parseQuestion(): XmlNode {
    // '<?' already confirmed
    const start = pos;
    pos += 2;
    const target = /^[A-Za-z_:][\w.:-]*/.exec(src.slice(pos))?.[0];
    if (!target) err("Processing instruction is missing a target name", start);
    pos += target!.length;
    const end = src.indexOf("?>", pos);
    if (end === -1) err("Unterminated processing instruction '?>'", start);
    const value = src.slice(pos, end);
    pos = end + 2;
    if (target === "xml" && start === firstTagStart) {
      return { type: "decl", value: src.slice(start, pos) };
    }
    return { type: "pi", target: target!, value };
  }

  let firstTagStart = -1;

  function parseElement(): XmlNode {
    pos++; // '<'
    const name = expectName();
    const attrs = parseAttributes();
    const selfClosing = src[pos] === "/";
    if (selfClosing) {
      pos++;
      if (src[pos] !== ">") err("'/' must be followed by '>'");
      pos++;
      return { type: "element", name, attrs, selfClosing, children: [] };
    }
    if (src[pos] !== ">") err(`Start tag of element '${name}' is not closed properly`);
    pos++;
    const children: XmlNode[] = [];
    for (;;) {
      if (pos >= n) err(`Element '${name}' is not closed`);
      if (src[pos] === "<") {
        if (src[pos + 1] === "/") {
          pos += 2;
          const closeName = expectName();
          if (closeName !== name)
            err(`Mismatched end tag: expected </${name}>, found </${closeName}>`);
          skipWs();
          if (src[pos] !== ">") err(`Malformed end tag </${closeName}>`);
          pos++;
          return { type: "element", name, attrs, selfClosing: false, children };
        }
        if (src.startsWith("<!--", pos) || src.startsWith("<![CDATA[", pos) || src.startsWith("<!", pos)) {
          const node = parseBang();
          if (node) children.push(node);
          continue;
        }
        if (src.startsWith("<?", pos)) {
          children.push(parseQuestion());
          continue;
        }
        children.push(parseElement());
        continue;
      }
      const next = src.indexOf("<", pos);
      const text = src.slice(pos, next === -1 ? n : next);
      pos = next === -1 ? n : next;
      children.push({ type: "text", value: text });
    }
  }

  const roots: XmlNode[] = [];
  for (;;) {
    // skip whitespace at the root level
    while (pos < n && /[\s]/.test(src[pos])) pos++;
    if (pos >= n) break;
    if (src[pos] !== "<") {
      // stray text at the root level
      const next = src.indexOf("<", pos);
      const text = src.slice(pos, next === -1 ? n : next);
      if (roots.some((r) => r.type === "element"))
        err("Unexpected text after the root element", pos);
      roots.push({ type: "text", value: text });
      pos = next === -1 ? n : next;
      continue;
    }
    if (src[pos + 1] === "/") err("End tag without a matching start tag", pos);
    const tagStart = pos;
    if (firstTagStart === -1 && (src.startsWith("<!", tagStart) || src.startsWith("<?", tagStart))) {
      firstTagStart = tagStart;
    }
    let node: XmlNode | null;
    if (src.startsWith("<!--", tagStart) || src.startsWith("<![CDATA[", tagStart) || src.startsWith("<!", tagStart)) {
      node = parseBang();
    } else if (src.startsWith("<?", tagStart)) {
      node = parseQuestion();
    } else {
      const elementCount = roots.filter((r) => r.type === "element").length;
      if (elementCount >= 1) err("A document may only have one root element", tagStart);
      firstTagStart = firstTagStart === -1 ? tagStart : firstTagStart;
      node = parseElement();
    }
    if (node) roots.push(node);
  }
  return roots;
}

function isWhitespaceText(node: XmlNode): boolean {
  return node.type === "text" && node.value.trim() === "";
}

/** Whether it holds non-whitespace text/CDATA — such mixed-content elements stay inline, never split across lines */
function hasInlineContent(children: XmlNode[]): boolean {
  return children.some(
    (c) => (c.type === "text" && c.value.trim() !== "") || c.type === "cdata"
  );
}

interface SerCtx {
  minify: boolean;
  pad: (d: number) => string;
  preserveComments: boolean;
}

function openTag(node: Extract<XmlNode, { type: "element" }>): string {
  const attrs = node.attrs
    .map(([k, v]) => ` ${k}="${v.replace(/"/g, "&quot;")}"`)
    .join("");
  return `<${node.name}${attrs}`;
}

/** Block serialization: in pretty mode returns indented multi-line text */
function serializeBlock(node: XmlNode, depth: number, ctx: SerCtx): string {
  switch (node.type) {
    case "comment":
      return `${ctx.pad(depth)}<!--${node.value}-->`;
    case "pi":
      return `${ctx.pad(depth)}<?${node.target}${node.value}?>`;
    case "decl":
      return node.value;
    case "doctype":
      return `${ctx.pad(depth)}${node.value}`;
    case "element":
      return ctx.pad(depth) + serializeElement(node, depth, ctx);
    case "text":
      return `${ctx.pad(depth)}${node.value.trim()}`;
    case "cdata":
      return `${ctx.pad(depth)}<![CDATA[${node.value}]]>`;
  }
}

function serializeElement(
  node: Extract<XmlNode, { type: "element" }>,
  depth: number,
  ctx: SerCtx
): string {
  const open = openTag(node);
  if (node.selfClosing) return `${open}/>`;
  if (node.children.length === 0) return `${open}></${node.name}>`;

  const visible = node.children.filter(
    (c) => ctx.preserveComments || c.type !== "comment"
  );

  if (!hasInlineContent(visible)) {
    // elements/comments only: each child on its own line
    const kids = visible.filter((c) => !isWhitespaceText(c));
    if (kids.length === 0) return `${open}></${node.name}>`;
    const inner = kids.map((c) => serializeBlock(c, depth + 1, ctx));
    if (ctx.minify) return `${open}>${inner.join("")}</${node.name}>`;
    return `${open}>\n${inner.join("\n")}\n${ctx.pad(depth)}</${node.name}>`;
  }

  // mixed content: keep text and whitespace verbatim to avoid changing semantics
  const inline = visible
    .map((c) => serializeInline(c, ctx))
    .join("");
  return `${open}>${inline}</${node.name}>`;
}

function serializeInline(node: XmlNode, ctx: SerCtx): string {
  switch (node.type) {
    case "text":
      return node.value;
    case "cdata":
      return `<![CDATA[${node.value}]]>`;
    case "comment":
      return `<!--${node.value}-->`;
    case "pi":
      return `<?${node.target}${node.value}?>`;
    case "decl":
    case "doctype":
      return node.value;
    case "element":
      return serializeElement(node, 0, ctx);
  }
}

function serializeRoots(roots: XmlNode[], opts: XmlOptions): string {
  const minify = opts.indent === "none";
  const ctx: SerCtx = {
    minify,
    pad: (() => {
      if (minify) return () => "";
      const s = opts.indent === "tab" ? "\t" : " ".repeat(Number(opts.indent));
      return (d: number) => s.repeat(d);
    })(),
    preserveComments: opts.preserveComments,
  };

  const visible = roots.filter(
    (c) => (ctx.preserveComments || c.type !== "comment") && !isWhitespaceText(c)
  );

  const blocks = visible.map((n) => serializeBlock(n, 0, ctx));
  if (ctx.minify) return blocks.join("");
  return blocks.join("\n");
}

/** parseXml tolerates stray root text, so the guard needs a real element. */
function hasXmlElement(text: string): boolean {
  try {
    return parseXml(text).some((node) => node.type === "element");
  } catch {
    return false;
  }
}

/**
 * Turn an escaped representation into XML source. Text that already holds
 * markup is kept as-is; a quoted JSON-style string is unwrapped; anything else
 * gets one level of escape sequences resolved.
 */
export function unescapeXmlInput(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length >= 2 && trimmed[0] === '"' && trimmed.at(-1) === '"') {
    try {
      const inner = JSON.parse(trimmed);
      if (typeof inner === "string" && hasXmlElement(inner)) return inner;
    } catch {
      // Not a complete quoted string; unescape it as raw text below.
    }
  }
  if (hasXmlElement(trimmed)) return text;
  return unescapeString(trimmed).output;
}

export function processXml(text: string, options: XmlOptions): XmlResult {
  const source = options.unescape ? unescapeXmlInput(text) : text;
  if (source.trim() === "") return { output: "", error: null };
  try {
    const roots = parseXml(source);
    return { output: serializeRoots(roots, options), error: null };
  } catch (err) {
    return { output: "", error: xmlSyntaxError(source, err) };
  }
}

/**
 * The first syntax error, without serialising the document. The editor's
 * gutter marker runs this on a pause in typing, so it has to name the same
 * spot the status line does.
 */
export function firstXmlError(text: string): XmlError | null {
  if (text.trim() === "") return null;
  try {
    parseXml(text);
    return null;
  } catch (err) {
    return xmlSyntaxError(text, err);
  }
}

function xmlSyntaxError(source: string, err: unknown): XmlError {
  if (err instanceof SyntaxError_) {
    const { line, column } = lineColumnAt(source, err.offset);
    return { message: err.message, line, column };
  }
  throw err;
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
