/**
 * JSON to Java. Every value seen at the same JSON path merges into one node, so
 * a field is as wide as the sample needs: a number that leaves the 32-bit range
 * becomes Long, a path holding mixed kinds falls back to Object. Objects below
 * the root become nested classes so the whole model stays one file.
 */

export type JavaStyle = "pojo" | "lombok" | "record";

export interface JavaOptions {
  rootName: string;
  style: JavaStyle;
}

export const defaultJavaOptions: JavaOptions = {
  rootName: "Root",
  style: "pojo",
};

type Kind = "string" | "number" | "boolean" | "object" | "array" | "null";

interface Node {
  kinds: Set<Kind>;
  /** cleared as soon as a non-whole number is seen at this path */
  integral: boolean;
  /** set once a number no longer fits an int32 */
  wide: boolean;
  /** path of the element type when this node holds an array */
  element: string | null;
  children: Map<string, string>;
}

const blank = (): Node => ({
  kinds: new Set(),
  integral: true,
  wide: false,
  element: null,
  children: new Map(),
});

const RESERVED = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
  "class", "const", "continue", "default", "do", "double", "else", "enum",
  "extends", "final", "finally", "float", "for", "goto", "if", "implements",
  "import", "instanceof", "int", "interface", "long", "native", "new",
  "package", "private", "protected", "public", "return", "short", "static",
  "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
  "transient", "try", "var", "void", "volatile", "while",
]);

function words(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

const cap = (word: string): string =>
  word[0].toUpperCase() + word.slice(1).toLowerCase();

/** Accessor names keep the field's own casing: userId -> getUserId. */
const upperFirst = (value: string): string =>
  value[0].toUpperCase() + value.slice(1);

function camel(value: string): string {
  const parts = words(value);
  if (parts.length === 0) return "";
  return parts[0].toLowerCase() + parts.slice(1).map(cap).join("");
}

function pascal(value: string, fallback: string): string {
  const parts = words(value);
  if (parts.length === 0) return fallback;
  const joined = parts.map(cap).join("");
  return /^[0-9]/.test(joined) ? `Value${joined}` : joined;
}

/** Drop a trailing plural so a list path names its element type. */
function singular(value: string): string {
  if (/ies$/.test(value)) return `${value.slice(0, -3)}y`;
  if (/(?:ses|xes|zes|ches|shes)$/.test(value)) return value.slice(0, -2);
  if (/s$/.test(value) && !/(?:ss|us)$/i.test(value)) return value.slice(0, -1);
  return value;
}

/** Fields stay camelCase; the JSON key they came from is kept by @JsonProperty. */
function fieldName(key: string, used: Set<string>): string {
  let base = camel(key);
  if (base === "" || !/^[A-Za-z_$]/.test(base)) base = `_${base}`;
  if (RESERVED.has(base)) base = `${base}_`;
  let name = base;
  let suffix = 2;
  while (used.has(name)) name = `${base}${suffix++}`;
  used.add(name);
  return name;
}

const quote = (value: string): string =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function collect(value: unknown, path: string, tree: Map<string, Node>): void {
  let entry = tree.get(path);
  if (!entry) {
    entry = blank();
    tree.set(path, entry);
  }
  if (value === null) return void entry.kinds.add("null");
  if (typeof value === "string") return void entry.kinds.add("string");
  if (typeof value === "number") {
    entry.kinds.add("number");
    if (!Number.isInteger(value)) entry.integral = false;
    if (Math.abs(value) > 0x7fffffff) entry.wide = true;
    return;
  }
  if (typeof value === "boolean") return void entry.kinds.add("boolean");
  if (Array.isArray(value)) {
    entry.kinds.add("array");
    entry.element = `${path}[]`;
    for (const item of value) collect(item, `${path}[]`, tree);
    return;
  }
  if (typeof value === "object") {
    entry.kinds.add("object");
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (!entry.children.has(key)) entry.children.set(key, `${path}.${key}`);
      collect(item, `${path}.${key}`, tree);
    }
    return;
  }
  entry.kinds.add("null");
}

/** Claim a unique class name for the shape at `path`. */
function className(path: string, taken: Set<string>): string {
  const segments = path.replace(/\[\]/g, "").split(".").filter(Boolean);
  const last = segments[segments.length - 1] ?? "value";
  const isElement = path.endsWith("[]");
  const base = pascal(
    isElement ? singular(last) : last,
    isElement ? "Item" : "Value",
  );
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  if (isElement && !taken.has(`${base}Item`)) {
    taken.add(`${base}Item`);
    return `${base}Item`;
  }
  for (let index = segments.length - 2; index >= 0; index--) {
    const candidate = pascal(`${segments[index]} ${base}`, "Value");
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  let suffix = 2;
  while (taken.has(`${base}${suffix}`)) suffix++;
  taken.add(`${base}${suffix}`);
  return `${base}${suffix}`;
}

const INDENT = "    ";

interface Field {
  json: string;
  java: string;
  type: string;
  path: string;
}

interface Clazz {
  name: string;
  fields: Field[];
  nested: Clazz[];
}

export interface JavaResult {
  output: string;
  error: string | null;
  /** classes in the output, root included */
  classes: number;
}

const failed = (error: string): JavaResult => ({ output: "", error, classes: 0 });

export function jsonToJava(
  text: string,
  options: JavaOptions,
): JavaResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    return failed(err instanceof Error ? err.message : String(err));
  }
  if (value === null || typeof value !== "object")
    return failed("Give an object, or an array of objects");

  const tree = new Map<string, Node>();
  collect(value, "root", tree);
  // A top-level array is modelled by the class of its elements.
  const rootEntry = tree.get("root")!;
  const rootPath = rootEntry.kinds.has("object")
    ? "root"
    : rootEntry.kinds.has("array")
      ? "root[]"
      : "";
  if (!rootPath || !tree.get(rootPath)?.kinds.has("object"))
    return failed("No object shape to model here");

  const rootName = pascal(options.rootName || "Root", "Root");
  const taken = new Set<string>([rootName]);
  const names = new Map<string, string>([[rootPath, rootName]]);
  const shapes = [...tree.keys()]
    .filter((path) => path !== rootPath && tree.get(path)?.kinds.has("object"))
    .sort((a, b) => b.length - a.length);
  for (const path of shapes) names.set(path, className(path, taken));

  const typeOf = (path: string): string => {
    const entry = tree.get(path);
    if (!entry || entry.kinds.size === 0) return "Object";
    if (entry.kinds.has("array")) {
      if (entry.kinds.size > 1) return "Object";
      return `List<${typeOf(entry.element ?? `${path}[]`)}>`;
    }
    if (entry.kinds.has("object"))
      return entry.kinds.size === 1 ? (names.get(path) ?? "Object") : "Object";
    const scalar = new Set(entry.kinds);
    scalar.delete("null");
    if (scalar.size !== 1) return "Object";
    if (scalar.has("string")) return "String";
    if (scalar.has("boolean")) return "Boolean";
    if (!entry.integral) return "Double";
    return entry.wide ? "Long" : "Integer";
  };

  /** Build the class for `path`, then the classes its fields own. */
  function shapeOf(path: string, name: string): Clazz {
    const entry = tree.get(path)!;
    const used = new Set<string>();
    const fields: Field[] = [];
    const nested: Clazz[] = [];
    for (const [json, child] of entry.children) {
      fields.push({ json, java: fieldName(json, used), type: typeOf(child), path: child });
      const node = tree.get(child);
      const held = node?.kinds.has("array")
        ? (node.element ?? null)
        : node?.kinds.has("object")
          ? child
          : null;
      if (held && tree.get(held)?.kinds.has("object"))
        nested.push(shapeOf(held, names.get(held) ?? "Value"));
    }
    return { name, fields, nested };
  }

  const style = options.style;
  let classCount = 0;

  function render(node: Clazz, depth: number): string {
    classCount++;
    const pad = INDENT.repeat(depth);
    const p = INDENT.repeat(depth + 1);
    if (style === "record") {
      const parts = node.fields.map(
        (f) =>
          `${f.java === f.json ? "" : `@JsonProperty(${quote(f.json)}) `}${f.type} ${f.java}`,
      );
      const header = `${pad}public record ${node.name}(${parts.join(", ")})`;
      if (node.nested.length === 0) return `${header} {}`;
      return `${header} {\n${node.nested.map((c) => render(c, depth + 1)).join("\n\n")}\n${pad}}`;
    }
    const blocks: string[] = [];
    const members: string[] = [];
    for (const f of node.fields) {
      if (f.java !== f.json) members.push(`${p}@JsonProperty(${quote(f.json)})`);
      members.push(`${p}private ${f.type} ${f.java};`);
    }
    if (members.length) blocks.push(members.join("\n"));
    if (style === "pojo") {
      for (const f of node.fields) {
        const name = upperFirst(f.java);
        blocks.push(
          [
            `${p}public ${f.type} get${name}() {`,
            `${p}${INDENT}return ${f.java};`,
            `${p}}`,
            "",
            `${p}public void set${name}(${f.type} ${f.java}) {`,
            `${p}${INDENT}this.${f.java} = ${f.java};`,
            `${p}}`,
          ].join("\n"),
        );
      }
    }
    for (const child of node.nested) blocks.push(render(child, depth + 1));
    const declaration = `${pad}public ${depth === 0 ? "" : "static "}class ${node.name}`;
    const head = style === "lombok" ? `${pad}@Data\n${declaration}` : declaration;
    if (blocks.length === 0) return `${head} {\n${pad}}`;
    return `${head} {\n${blocks.join("\n\n")}\n${pad}}`;
  }

  const body = render(shapeOf(rootPath, rootName), 0);
  const imports: string[] = [];
  if (body.includes("@JsonProperty"))
    imports.push("import com.fasterxml.jackson.annotation.JsonProperty;");
  if (body.includes("List<")) imports.push("import java.util.List;");
  if (style === "lombok") imports.push("import lombok.Data;");
  const output = `${imports.length ? `${imports.join("\n")}\n\n` : ""}${body}\n`;
  return { output, error: null, classes: classCount };
}
