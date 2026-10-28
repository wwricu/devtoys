export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface Match {
  /** Normalized path of the match, e.g. `$.items[0].name`. */
  path: string;
  value: JsonValue;
}

export interface PathError {
  message: string;
  position: number;
}

export interface PathResult {
  matches: Match[] | null;
  error: PathError | null;
}

interface SimpleStep {
  kind: "key" | "index";
  name?: string;
  index?: number;
}

type Operand =
  | { kind: "literal"; value: JsonValue }
  | { kind: "path"; root: "@" | "$"; steps: SimpleStep[] };

type FilterNode =
  | { kind: "or" | "and"; left: FilterNode; right: FilterNode }
  | { kind: "not"; arg: FilterNode }
  | { kind: "compare"; operator: string; left: Operand; right: Operand }
  | { kind: "exists"; operand: Operand };

type Step =
  | { kind: "child"; name: string; recursive: boolean }
  | { kind: "wildcard"; recursive: boolean }
  | { kind: "union"; keys: (string | number)[] }
  | { kind: "slice"; start: number | null; end: number | null; step: number | null }
  | { kind: "filter"; predicate: FilterNode };

class PathSyntaxError extends Error {
  readonly position: number;

  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

const NAME_RE = /^[\p{L}\p{N}_$-]+/u;
const INDEX_RE = /^-?\d+/;

class Parser {
  private pos = 0;
  private readonly text: string;

  constructor(text: string) {
    this.text = text;
  }

  parse(): Step[] {
    this.skipWs();
    if (this.text[this.pos] !== "$") {
      throw new PathSyntaxError('Path must start with "$"', this.pos);
    }
    this.pos++;
    const steps: Step[] = [];
    while (true) {
      this.skipWs();
      const ch = this.text[this.pos];
      if (ch === ".") {
        if (this.text[this.pos + 1] === ".") {
          this.pos += 2;
          this.skipWs();
          if (this.text[this.pos] === "*") {
            this.pos++;
            steps.push({ kind: "wildcard", recursive: true });
          } else {
            steps.push({
              kind: "child",
              name: this.readName(),
              recursive: true,
            });
          }
        } else {
          this.pos++;
          this.skipWs();
          if (this.text[this.pos] === "*") {
            this.pos++;
            steps.push({ kind: "wildcard", recursive: false });
          } else if (this.text[this.pos] !== "[") {
            // `.['name']` is accepted; the bracket is parsed on the next pass.
            steps.push({
              kind: "child",
              name: this.readName(),
              recursive: false,
            });
          }
        }
      } else if (ch === "[") {
        steps.push(this.parseBracket());
      } else {
        break;
      }
    }
    this.skipWs();
    if (this.pos < this.text.length) {
      throw new PathSyntaxError(
        `Unexpected "${this.text[this.pos]}"`,
        this.pos,
      );
    }
    return steps;
  }

  private parseBracket(): Step {
    this.pos++; // [
    this.skipWs();
    const ch = this.text[this.pos];

    if (ch === "*") {
      this.pos++;
      this.skipWs();
      this.expect("]");
      return { kind: "wildcard", recursive: false };
    }

    if (ch === "?") {
      this.pos++;
      this.skipWs();
      this.expect("(");
      const predicate = this.parseOr();
      this.skipWs();
      this.expect(")");
      this.skipWs();
      this.expect("]");
      return { kind: "filter", predicate };
    }

    if (ch === "'" || ch === '"') {
      const keys: (string | number)[] = [this.readString()];
      this.skipWs();
      while (this.text[this.pos] === ",") {
        this.pos++;
        this.skipWs();
        keys.push(this.readString());
        this.skipWs();
      }
      this.expect("]");
      return { kind: "union", keys };
    }

    const start = this.readIndexOrNull();
    this.skipWs();
    if (this.text[this.pos] === ":") {
      this.pos++;
      this.skipWs();
      const end = this.readIndexOrNull();
      this.skipWs();
      let step: number | null = null;
      if (this.text[this.pos] === ":") {
        this.pos++;
        this.skipWs();
        step = this.readIndex();
        this.skipWs();
      }
      this.expect("]");
      return { kind: "slice", start, end, step };
    }

    if (start === null) {
      throw new PathSyntaxError("Expected an index, name or slice", this.pos);
    }
    const keys: (string | number)[] = [start];
    while (this.text[this.pos] === ",") {
      this.pos++;
      this.skipWs();
      keys.push(this.readIndex());
      this.skipWs();
    }
    this.expect("]");
    return { kind: "union", keys };
  }

  private parseOr(): FilterNode {
    let node = this.parseAnd();
    while (this.matchToken("||")) {
      node = { kind: "or", left: node, right: this.parseAnd() };
    }
    return node;
  }

  private parseAnd(): FilterNode {
    let node = this.parseUnary();
    while (this.matchToken("&&")) {
      node = { kind: "and", left: node, right: this.parseUnary() };
    }
    return node;
  }

  private parseUnary(): FilterNode {
    this.skipWs();
    if (this.text[this.pos] === "!" && this.text[this.pos + 1] !== "=") {
      this.pos++;
      return { kind: "not", arg: this.parseUnary() };
    }
    if (this.text[this.pos] === "(") {
      this.pos++;
      const node = this.parseOr();
      this.skipWs();
      this.expect(")");
      return node;
    }
    return this.parseComparison();
  }

  private parseComparison(): FilterNode {
    const left = this.parseOperand();
    this.skipWs();
    for (const operator of ["==", "!=", "<=", ">=", "<", ">"]) {
      if (this.text.startsWith(operator, this.pos)) {
        this.pos += operator.length;
        return {
          kind: "compare",
          operator,
          left,
          right: this.parseOperand(),
        };
      }
    }
    return { kind: "exists", operand: left };
  }

  private parseOperand(): Operand {
    this.skipWs();
    const ch = this.text[this.pos];
    if (ch === "@" || ch === "$") {
      this.pos++;
      return {
        kind: "path",
        root: ch,
        steps: this.parseSimplePath(),
      };
    }
    if (ch === "'" || ch === '"') {
      return { kind: "literal", value: this.readString() };
    }
    if (this.matchKeyword("true")) {
      return { kind: "literal", value: true };
    }
    if (this.matchKeyword("false")) {
      return { kind: "literal", value: false };
    }
    if (this.matchKeyword("null")) {
      return { kind: "literal", value: null };
    }
    const number = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      this.text.slice(this.pos),
    );
    if (number) {
      this.pos += number[0].length;
      return { kind: "literal", value: Number(number[0]) };
    }
    throw new PathSyntaxError("Expected a value or @ path", this.pos);
  }

  private parseSimplePath(): SimpleStep[] {
    const steps: SimpleStep[] = [];
    while (true) {
      const ch = this.text[this.pos];
      if (ch === ".") {
        this.pos++;
        steps.push({ kind: "key", name: this.readName() });
      } else if (ch === "[") {
        this.pos++;
        this.skipWs();
        const start = this.text[this.pos];
        if (start === "'" || start === '"') {
          const name = this.readString();
          this.skipWs();
          this.expect("]");
          steps.push({ kind: "key", name });
        } else {
          const index = this.readIndex();
          this.skipWs();
          this.expect("]");
          steps.push({ kind: "index", index });
        }
      } else {
        break;
      }
    }
    return steps;
  }

  private readName(): string {
    const m = NAME_RE.exec(this.text.slice(this.pos));
    if (!m) throw new PathSyntaxError("Expected a property name", this.pos);
    this.pos += m[0].length;
    return m[0];
  }

  private readIndex(): number {
    const index = this.readIndexOrNull();
    if (index === null) throw new PathSyntaxError("Expected an index", this.pos);
    return index;
  }

  private readIndexOrNull(): number | null {
    const m = INDEX_RE.exec(this.text.slice(this.pos));
    if (!m) return null;
    this.pos += m[0].length;
    return Number(m[0]);
  }

  private readString(): string {
    const quote = this.text[this.pos];
    if (quote !== "'" && quote !== '"') {
      throw new PathSyntaxError("Expected a quoted name", this.pos);
    }
    this.pos++;
    let out = "";
    while (this.pos < this.text.length) {
      const ch = this.text[this.pos++];
      if (ch === quote) return out;
      if (ch !== "\\") {
        out += ch;
        continue;
      }
      const escape = this.text[this.pos++];
      if (escape === "u") {
        const hex = this.text.slice(this.pos, this.pos + 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          throw new PathSyntaxError("Bad unicode escape", this.pos);
        }
        out += String.fromCharCode(parseInt(hex, 16));
        this.pos += 4;
      } else {
        out += escape ?? "";
      }
    }
    throw new PathSyntaxError("Unterminated string", this.pos);
  }

  private matchKeyword(word: string): boolean {
    if (!this.text.startsWith(word, this.pos)) return false;
    const next = this.text[this.pos + word.length];
    if (next && /[\p{L}\p{N}_$]/u.test(next)) return false;
    this.pos += word.length;
    return true;
  }

  private matchToken(token: string): boolean {
    this.skipWs();
    if (!this.text.startsWith(token, this.pos)) return false;
    this.pos += token.length;
    return true;
  }

  private skipWs() {
    while (this.pos < this.text.length && /\s/.test(this.text[this.pos])) {
      this.pos++;
    }
  }

  private expect(ch: string) {
    if (this.text[this.pos] !== ch) {
      throw new PathSyntaxError(`Expected "${ch}"`, this.pos);
    }
    this.pos++;
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function childPath(base: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${base}.${key}`
    : `${base}[${JSON.stringify(key)}]`;
}

function evalOperand(
  operand: Operand,
  current: JsonValue,
  root: JsonValue,
): JsonValue | undefined {
  if (operand.kind === "literal") return operand.value;
  let value: JsonValue | undefined = operand.root === "@" ? current : root;
  for (const step of operand.steps) {
    if (step.kind === "key") {
      if (!isObject(value) || !(step.name! in value)) return undefined;
      value = value[step.name!];
    } else {
      if (!Array.isArray(value)) return undefined;
      const stepIndex = step.index ?? 0;
      const index: number =
        stepIndex < 0 ? value.length + stepIndex : stepIndex;
      if (index < 0 || index >= value.length) return undefined;
      value = value[index];
    }
  }
  return value;
}

function valuesEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object" && typeof b === "object" && a && b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function evalFilter(
  node: FilterNode,
  current: JsonValue,
  root: JsonValue,
): boolean {
  switch (node.kind) {
    case "or":
      return (
        evalFilter(node.left, current, root) ||
        evalFilter(node.right, current, root)
      );
    case "and":
      return (
        evalFilter(node.left, current, root) &&
        evalFilter(node.right, current, root)
      );
    case "not":
      return !evalFilter(node.arg, current, root);
    case "exists":
      return evalOperand(node.operand, current, root) !== undefined;
    case "compare": {
      const left = evalOperand(node.left, current, root);
      const right = evalOperand(node.right, current, root);
      if (left === undefined || right === undefined) return false;
      if (node.operator === "==") return valuesEqual(left, right);
      if (node.operator === "!=") return !valuesEqual(left, right);
      if (
        typeof left !== "number" ||
        typeof right !== "number"
      ) {
        if (typeof left !== "string" || typeof right !== "string") {
          return false;
        }
        const a = left;
        const b = right;
        switch (node.operator) {
          case "<":
            return a < b;
          case "<=":
            return a <= b;
          case ">":
            return a > b;
          case ">=":
            return a >= b;
        }
        return false;
      }
      switch (node.operator) {
        case "<":
          return left < right;
        case "<=":
          return left <= right;
        case ">":
          return left > right;
        case ">=":
          return left >= right;
      }
      return false;
    }
  }
}

function collectChildren(node: Match, out: Match[]) {
  if (Array.isArray(node.value)) {
    node.value.forEach((value, index) =>
      out.push({ path: `${node.path}[${index}]`, value }),
    );
  } else if (isObject(node.value)) {
    for (const [key, value] of Object.entries(node.value)) {
      out.push({ path: childPath(node.path, key), value });
    }
  }
}

function collectDescendants(node: Match, out: Match[]) {
  const children: Match[] = [];
  collectChildren(node, children);
  for (const child of children) {
    out.push(child);
    collectDescendants(child, out);
  }
}

function collectRecursive(node: Match, name: string, out: Match[]) {
  if (isObject(node.value)) {
    if (name in node.value) {
      out.push({ path: childPath(node.path, name), value: node.value[name] });
    }
    for (const [key, value] of Object.entries(node.value)) {
      collectRecursive({ path: childPath(node.path, key), value }, name, out);
    }
  } else if (Array.isArray(node.value)) {
    node.value.forEach((value, index) =>
      collectRecursive(
        { path: `${node.path}[${index}]`, value },
        name,
        out,
      ),
    );
  }
}

function sliceIndices(
  length: number,
  step: { start: number | null; end: number | null; step: number | null },
): number[] {
  const stride = step.step ?? 1;
  const indexes: number[] = [];
  if (stride === 0) return indexes;
  if (stride > 0) {
    let start = step.start ?? 0;
    let end = step.end ?? length;
    if (start < 0) start += length;
    if (end < 0) end += length;
    start = Math.max(0, Math.min(length, start));
    end = Math.max(0, Math.min(length, end));
    for (let i = start; i < end; i += stride) indexes.push(i);
  } else {
    let start = step.start ?? length - 1;
    let end = step.end ?? -1;
    if (start < 0) start += length;
    if (step.end !== null && step.end < 0) end += length;
    start = Math.max(-1, Math.min(length - 1, start));
    end = Math.max(-1, Math.min(length - 1, end));
    for (let i = start; i > end; i += stride) indexes.push(i);
  }
  return indexes;
}

function applyStep(nodes: Match[], step: Step, root: JsonValue): Match[] {
  const out: Match[] = [];
  switch (step.kind) {
    case "child":
      for (const node of nodes) {
        if (step.recursive) {
          collectRecursive(node, step.name, out);
        } else if (
          isObject(node.value) &&
          step.name in node.value
        ) {
          out.push({
            path: childPath(node.path, step.name),
            value: node.value[step.name],
          });
        }
      }
      break;
    case "wildcard":
      for (const node of nodes) {
        if (step.recursive) collectDescendants(node, out);
        else collectChildren(node, out);
      }
      break;
    case "union":
      for (const node of nodes) {
        for (const key of step.keys) {
          if (typeof key === "string") {
            if (isObject(node.value) && key in node.value) {
              out.push({
                path: childPath(node.path, key),
                value: node.value[key],
              });
            }
          } else if (Array.isArray(node.value)) {
            const index = key < 0 ? node.value.length + key : key;
            if (index >= 0 && index < node.value.length) {
              out.push({
                path: `${node.path}[${index}]`,
                value: node.value[index],
              });
            }
          }
        }
      }
      break;
    case "slice":
      for (const node of nodes) {
        if (!Array.isArray(node.value)) continue;
        for (const index of sliceIndices(node.value.length, step)) {
          out.push({
            path: `${node.path}[${index}]`,
            value: node.value[index],
          });
        }
      }
      break;
    case "filter":
      for (const node of nodes) {
        if (!Array.isArray(node.value)) continue;
        node.value.forEach((value, index) => {
          if (evalFilter(step.predicate, value, root)) {
            out.push({ path: `${node.path}[${index}]`, value });
          }
        });
      }
      break;
  }
  return out;
}

/** Evaluate a JSONPath expression against a parsed JSON document. */
export function evaluateJsonPath(root: JsonValue, text: string): PathResult {
  try {
    const steps = new Parser(text).parse();
    let nodes: Match[] = [{ path: "$", value: root }];
    for (const step of steps) nodes = applyStep(nodes, step, root);
    return { matches: nodes, error: null };
  } catch (error) {
    if (error instanceof PathSyntaxError) {
      return {
        matches: null,
        error: { message: error.message, position: error.position },
      };
    }
    throw error;
  }
}
