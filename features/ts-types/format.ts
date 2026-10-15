/**
 * JSON to TypeScript declarations. Every value seen at the same path is merged
 * into one shape, so a key present in only some objects becomes optional and a
 * key holding mixed types becomes a union.
 */

export interface TsOptions {
  rootName: string;
  exportTypes: boolean;
  preferArraySyntax: boolean;
  readonly: boolean;
  unknownAsAny: boolean;
}

export const defaultTsOptions: TsOptions = {
  rootName: "Root",
  exportTypes: true,
  preferArraySyntax: false,
  readonly: false,
  unknownAsAny: false,
};

interface PathNode {
  kinds: Set<string>;
  elementPath: string | null;
  objects: number;
  keys: Map<string, number>;
  children: Map<string, string>;
}

const node = (): PathNode => ({
  kinds: new Set(),
  elementPath: null,
  objects: 0,
  keys: new Map(),
  children: new Map(),
});

function pascal(value: string): string {
  const words = value
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const joined = words
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("");
  if (joined === "") return "Item";
  return /^[0-9]/.test(joined) ? `_${joined}` : joined;
}

/** Drop a trailing plural so a list path names its element type. */
function singular(value: string): string {
  if (/ies$/.test(value)) return `${value.slice(0, -3)}y`;
  if (/(?:ses|xes|zes|ches|shes)$/.test(value)) return value.slice(0, -2);
  if (/s$/.test(value) && !/(?:ss|us)$/i.test(value)) return value.slice(0, -1);
  return value;
}

const identifier = (name: string): string =>
  /^[A-Za-z_$][\w$]*$/.test(name) ? name : `"${name}"`;

/** `A | B` inside an array type needs brackets to stay one element type. */
const bracketed = (inner: string): string =>
  inner.includes("|") ? `(${inner})` : inner;

function collect(
  value: unknown,
  path: string,
  tree: Map<string, PathNode>,
): void {
  let entry = tree.get(path);
  if (!entry) {
    entry = node();
    tree.set(path, entry);
  }
  if (value === null) return void entry.kinds.add("null");
  if (typeof value === "string") return void entry.kinds.add("string");
  if (typeof value === "number") return void entry.kinds.add("number");
  if (typeof value === "boolean") return void entry.kinds.add("boolean");
  if (Array.isArray(value)) {
    entry.kinds.add("array");
    entry.elementPath = `${path}[]`;
    for (const item of value) collect(item, `${path}[]`, tree);
    return;
  }
  if (typeof value === "object") {
    entry.kinds.add("object");
    entry.objects++;
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      entry.keys.set(key, (entry.keys.get(key) ?? 0) + 1);
      if (!entry.children.has(key)) entry.children.set(key, `${path}.${key}`);
      collect(item, `${path}.${key}`, tree);
    }
    return;
  }
  entry.kinds.add("unknown");
}

function nameFor(path: string, taken: Set<string>): string {
  const isArrayElement = path.endsWith("[]");
  const segments = path.replace(/\[\]/g, "").split(".").filter(Boolean);
  const last = segments[segments.length - 1] ?? "value";
  const base = isArrayElement ? singular(pascal(last)) : pascal(last);
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  if (isArrayElement && !taken.has(`${base}Item`)) {
    taken.add(`${base}Item`);
    return `${base}Item`;
  }
  for (let index = segments.length - 2; index >= 0; index--) {
    const candidate = `${pascal(segments[index])}${base}`;
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

export function jsonToTypeScript(
  text: string,
  options: TsOptions,
): { output: string; error: string | null } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    return {
      output: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const tree = new Map<string, PathNode>();
  collect(value, "root", tree);

  const taken = new Set<string>();
  const names = new Map<string, string>();
  const rootName = pascal(options.rootName || "Root");
  taken.add(rootName);
  // Deeper paths claim names first so an element type keeps its short name.
  const objectPaths = [...tree.keys()]
    .filter((path) => path !== "root" && tree.get(path)?.kinds.has("object"))
    .sort((a, b) => b.length - a.length);
  for (const path of objectPaths) {
    names.set(path, nameFor(path, taken));
  }

  const typeOf = (path: string): string => {
    const entry = tree.get(path);
    if (!entry || entry.kinds.size === 0)
      return options.unknownAsAny ? "any" : "unknown";
    const parts: string[] = [];
    if (entry.kinds.has("object")) {
      parts.push(path === "root" ? rootName : (names.get(path) ?? "object"));
    }
    if (entry.kinds.has("array")) {
      const inner = typeOf(entry.elementPath ?? `${path}[]`);
      parts.push(
        options.preferArraySyntax ? `Array<${inner}>` : `${bracketed(inner)}[]`,
      );
    }
    for (const kind of ["string", "number", "boolean", "null"]) {
      if (entry.kinds.has(kind)) parts.push(kind);
    }
    if (entry.kinds.has("unknown"))
      parts.push(options.unknownAsAny ? "any" : "unknown");
    return [...new Set(parts)].join(" | ");
  };

  const keyword = options.exportTypes ? "export interface" : "interface";
  const readonlyMark = options.readonly ? "readonly " : "";
  const blocks: string[] = [];
  // Emit the deepest shapes first so a name is defined before it is referenced.
  const shapePaths = [...tree.keys()]
    .filter((path) => path !== "root" && tree.get(path)?.kinds.has("object"))
    .sort(
      (a, b) =>
        b.split(".").length - a.split(".").length || b.length - a.length,
    );
  if (tree.get("root")?.kinds.has("object")) shapePaths.push("root");
  for (const path of shapePaths) {
    const entry = tree.get(path)!;
    const name = path === "root" ? rootName : names.get(path);
    if (!name) continue;
    const members: string[] = [];
    for (const [key, child] of entry.children) {
      const optional = (entry.keys.get(key) ?? 0) < entry.objects ? "?" : "";
      members.push(
        `  ${readonlyMark}${identifier(key)}${optional}: ${typeOf(child)};`,
      );
    }
    blocks.push(
      members.length
        ? `${keyword} ${name} {\n${members.join("\n")}\n}`
        : `${keyword} ${name} {}`,
    );
  }

  const root = tree.get("root");
  const rootIsObject = root?.kinds.size === 1 && root.kinds.has("object");
  const lines = [...blocks];
  if (!rootIsObject) {
    const alias = options.exportTypes ? "export type" : "type";
    lines.push(`${alias} ${rootName} = ${typeOf("root")};`);
  }

  const output = lines.length
    ? `${lines.join("\n\n")}\n`
    : `${rootName} has no shape\n`;
  return { output, error: null };
}
