/**
 * Java to JSON. Field declarations and record components are read out of the
 * source and turned into a sample object, so the first class in the file
 * becomes the shape of the JSON. Static fields are left out because Jackson
 * does not serialise them; an explicit `@JsonProperty("x")` renames a key.
 */

interface FieldDecl {
  json: string;
  name: string;
  type: string;
}

interface Decl {
  name: string;
  /** offsets of the declaration body in the masked text, -1 when it has none */
  start: number;
  end: number;
  fields: FieldDecl[];
}

const MODIFIERS = new Set([
  "public", "private", "protected", "static", "final", "transient", "volatile",
  "default", "synchronized", "native", "abstract", "strictfp",
]);

const SCALARS: Record<string, unknown> = {
  byte: 0, short: 0, int: 0, long: 0, float: 0, double: 0,
  Byte: 0, Short: 0, Integer: 0, Long: 0, Float: 0, Double: 0,
  BigDecimal: 0, BigInteger: 0,
  boolean: false, Boolean: false,
  char: "", Character: "",
  String: "", CharSequence: "", UUID: "", URI: "", URL: "",
  Date: "", LocalDate: "", LocalDateTime: "", LocalTime: "",
  Instant: "", ZonedDateTime: "", OffsetDateTime: "",
};

const COLLECTIONS = new Set([
  "List", "ArrayList", "LinkedList", "CopyOnWriteArrayList", "Set", "HashSet",
  "LinkedHashSet", "TreeSet", "Collection", "Iterable", "Stream",
]);

const MAPS = new Set([
  "Map", "HashMap", "LinkedHashMap", "TreeMap", "ConcurrentHashMap",
  "SortedMap", "Hashtable", "Properties",
]);

/** Comment and literal bodies go blank, so scanning only sees structure. */
function mask(src: string): string {
  const out = src.split("");
  const clear = (from: number, to: number) => {
    for (let i = from; i < to && i < out.length; i++)
      if (out[i] !== "\n" && out[i] !== "\r") out[i] = " ";
  };
  let i = 0;
  while (i < src.length) {
    const next = src[i + 1];
    if (src[i] === "/" && next === "/") {
      let j = i;
      while (j < src.length && src[j] !== "\n") j++;
      clear(i, j);
      i = j;
      continue;
    }
    if (src[i] === "/" && next === "*") {
      let j = i + 2;
      while (j < src.length && !(src[j] === "*" && src[j + 1] === "/")) j++;
      clear(i, Math.min(j + 2, src.length));
      i = Math.min(j + 2, src.length);
      continue;
    }
    if (src[i] === '"' || src[i] === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== src[i]) {
        if (src[j] === "\\") j++;
        j++;
      }
      clear(i + 1, j);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out.join("");
}

function matchBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return text.length - 1;
}

/** Offset of the body brace after a `class X` header, -1 when there is none. */
function bodyOf(masked: string, from: number): { start: number; end: number } {
  let parens = 0;
  for (let i = from; i < masked.length; i++) {
    const c = masked[i];
    if (c === "(") parens++;
    else if (c === ")") parens--;
    else if (c === ";" && parens === 0) break;
    else if (c === "{" && parens === 0)
      return { start: i, end: matchBrace(masked, i) };
  }
  return { start: -1, end: -1 };
}

/** Split a generic type into its arguments, respecting nesting. */
function genericArgs(type: string): string[] {
  const open = type.indexOf("<");
  if (open < 0 || !type.endsWith(">")) return [];
  const inner = type.slice(open + 1, -1);
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === "<") depth++;
    else if (c === ">") depth--;
    else if (c === "," && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(inner.slice(start).trim());
  return parts.filter(Boolean);
}

const bareName = (type: string): string =>
  (
    type
      .replace(/<.*$/, "")
      .replace(/\[\]/g, "")
      .replace(/^\?\s*(?:extends|super)\s+/, "")
      .trim()
      .split(".")
      .pop() ?? type
  );

/** `@JsonProperty("x")` on this declaration, if the source carries one. */
function wireName(source: string, fallback: string): string {
  const match = source.match(/@JsonProperty\s*\(\s*(?:value\s*=\s*)?"([^"]*)"/);
  return match?.[1] ? match[1] : fallback;
}

/**
 * One statement of a class body or one record component: `Type name`, with
 * modifiers, annotations and initialisers taken off. Anything that reads like a
 * method, a constructor or a nested type is rejected.
 */
function parseField(statement: string, original: string): FieldDecl | null {
  const declaration = statement
    .replace(/@[A-Za-z_]\w*(\s*\([^()]*\))?/g, " ")
    .replace(/\s+/g, " ")
    .split("=")[0]
    .trim();
  if (
    declaration === "" ||
    declaration.includes("(") ||
    /^(?:package|import|class|interface|enum|record|new|return)\b/.test(declaration)
  )
    return null;
  const tokens = declaration.split(" ");
  let isStatic = false;
  while (MODIFIERS.has(tokens[0])) {
    if (tokens[0] === "static") isStatic = true;
    tokens.shift();
  }
  if (isStatic || tokens.length < 2) return null;
  const match = tokens
    .join(" ")
    .match(
      /^(?<type>[A-Za-z_$][\w.$<>,?\s\[\]]*?)\s+(?<names>[A-Za-z_$]\w*(?:\s*,\s*[A-Za-z_$]\w*)*)$/,
    );
  if (!match?.groups) return null;
  const type = match.groups.type.replace(/\s+/g, "");
  const name = match.groups.names.split(",")[0]?.trim() ?? "";
  if (name === "" || name === "serialVersionUID") return null;
  return { json: wireName(original, name), name, type };
}

/** The components of `record X(A a, B b)` are its serialised fields. */
function components(masked: string, src: string, open: number): FieldDecl[] {
  let depth = 0;
  let close = open;
  for (; close < masked.length; close++) {
    if (masked[close] === "(") depth++;
    else if (masked[close] === ")") {
      depth--;
      if (depth === 0) break;
    }
  }
  const fields: FieldDecl[] = [];
  let start = 0;
  let angle = 0;
  const inner = masked.slice(open + 1, close);
  for (let i = 0; i <= inner.length; i++) {
    const c = inner[i];
    if (c === "<") angle++;
    else if (c === ">") angle--;
    else if ((c === "," && angle === 0) || i === inner.length) {
      const field = parseField(
        inner.slice(start, i).replace(/\s+/g, " ").trim(),
        src.slice(open + 1 + start, open + 1 + i),
      );
      if (field) fields.push(field);
      start = i + 1;
    }
  }
  return fields;
}

/** Field declarations inside one body, with nested types skipped over. */
function fieldsOf(
  masked: string,
  src: string,
  start: number,
  end: number,
  skip: Decl[],
): FieldDecl[] {
  const fields: FieldDecl[] = [];
  let from = start + 1;
  let i = from;
  let parens = 0;
  while (i < end) {
    const hidden = skip.find((d) => i >= d.start && i <= d.end);
    if (hidden) {
      i = hidden.end + 1;
      from = i;
      continue;
    }
    const c = masked[i];
    if (c === "(") parens++;
    else if (c === ")") parens--;
    else if (c === "{" && parens === 0) {
      const close = matchBrace(masked, i);
      // `= { … }` is an array initialiser, so the declaration stays open.
      if (!masked.slice(from, i).includes("=")) from = close + 1;
      i = close + 1;
      continue;
    } else if (c === ";" && parens === 0) {
      const field = parseField(
        masked.slice(from, i).replace(/\s+/g, " ").trim(),
        src.slice(from, i),
      );
      if (field) fields.push(field);
      from = i + 1;
      i = from;
      continue;
    }
    i++;
  }
  return fields;
}

export interface JavaParseResult {
  output: string;
  error: string | null;
  /** the class the JSON was built from */
  root: string;
  /** types with no shape to follow, rendered as an empty object */
  unresolved: string[];
}

export function javaClassToJson(text: string): JavaParseResult {
  const empty: JavaParseResult = {
    output: "",
    error: "",
    root: "",
    unresolved: [],
  };
  const masked = mask(text);
  const found: Decl[] = [];
  const header = /\b(class|record)\s+([A-Za-z_$]\w*)/g;
  let match: RegExpExecArray | null;
  while ((match = header.exec(masked)) !== null) {
    const isRecord = match[1] === "record";
    const open = masked.indexOf("(", match.index);
    const { start, end } = bodyOf(masked, match.index + match[0].length);
    const fields =
      isRecord && open >= 0 && (start < 0 || open < start)
        ? components(masked, text, open)
        : [];
    found.push({ name: match[2], start, end, fields });
  }
  if (found.length === 0)
    return { ...empty, error: "No class or record found in this text" };

  for (const decl of found) {
    if (decl.start >= 0) {
      const nested = found.filter(
        (d) => d !== decl && d.start > decl.start && d.end < decl.end,
      );
      if (decl.fields.length === 0)
        decl.fields = fieldsOf(masked, text, decl.start, decl.end, nested);
    }
  }

  const byName = new Map<string, Decl>();
  for (const decl of found) if (!byName.has(decl.name)) byName.set(decl.name, decl);
  const rootDecl = found.find(
    (d) => !found.some((o) => o !== d && d.start >= o.start && d.end <= o.end),
  );
  if (!rootDecl) return { ...empty, error: "No top-level class found" };

  const unresolved = new Set<string>();

  const sampleOf = (type: string, seen: Set<string>): unknown => {
    const cleaned = type.replace(/\s+/g, "");
    if (cleaned.endsWith("[]"))
      return [sampleOf(cleaned.slice(0, -2), seen)];
    const base = bareName(cleaned);
    const args = genericArgs(cleaned);
    if (base === "Optional") return args[0] ? sampleOf(args[0], seen) : {};
    if (COLLECTIONS.has(base)) return args[0] ? [sampleOf(args[0], seen)] : [];
    if (MAPS.has(base)) return args[1] ? { key: sampleOf(args[1], seen) } : {};
    if (Object.prototype.hasOwnProperty.call(SCALARS, base)) return SCALARS[base];
    if (base === "Object" || base === "?" || /^[A-Z]$/.test(base)) return {};
    const decl = byName.get(base);
    if (!decl || seen.has(decl.name)) {
      if (!decl) unresolved.add(cleaned);
      return {};
    }
    const object: Record<string, unknown> = {};
    const next = new Set(seen).add(decl.name);
    for (const field of decl.fields) object[field.json] = sampleOf(field.type, next);
    return object;
  };

  const sample: Record<string, unknown> = {};
  for (const field of rootDecl.fields)
    sample[field.json] = sampleOf(field.type, new Set([rootDecl.name]));
  return {
    output: `${JSON.stringify(sample, null, 2)}\n`,
    error: null,
    root: rootDecl.name,
    unresolved: [...unresolved],
  };
}
