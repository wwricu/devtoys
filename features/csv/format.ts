export type Delimiter = "," | ";" | "\t" | "|";

export interface CsvToJsonOptions {
  delimiter: Delimiter;
  header: boolean;
  inferTypes: boolean;
  expandDots: boolean;
}

export interface JsonToCsvOptions {
  delimiter: Delimiter;
  flatten: boolean;
}

function cell(text: string, delimiter: Delimiter): string {
  if (text.includes(delimiter) || text.includes('"') || /[\r\n]/.test(text))
    return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function flattenRow(
  value: Record<string, unknown>,
  prefix: string,
  out: Record<string, unknown>,
): void {
  for (const [k, v] of Object.entries(value)) {
    const key = prefix === "" ? k : `${prefix}.${k}`;
    if (v && typeof v === "object" && !Array.isArray(v)) flattenRow(v as Record<string, unknown>, key, out);
    else out[key] = v;
  }
}

export function jsonToCsv(input: unknown, opts: JsonToCsvOptions): string {
  let rows: unknown[];
  if (Array.isArray(input)) rows = input;
  else if (input && typeof input === "object") rows = [input];
  else throw new Error("CSV needs a JSON array of objects (or a single object)");

  if (rows.length === 0) return "";
  if (rows.some((r) => r === null || typeof r !== "object" || Array.isArray(r)))
    throw new Error("Every row must be an object");

  const records = rows.map((r) => {
    const obj = r as Record<string, unknown>;
    if (!opts.flatten) return obj;
    const flat: Record<string, unknown> = {};
    flattenRow(obj, "", flat);
    return flat;
  });

  const keys: string[] = [];
  for (const record of records)
    for (const k of Object.keys(record)) if (!keys.includes(k)) keys.push(k);

  const lines = [keys.map((k) => cell(k, opts.delimiter)).join(opts.delimiter)];
  for (const record of records)
    lines.push(keys.map((k) => cell(stringify(record[k]), opts.delimiter)).join(opts.delimiter));
  return lines.join("\r\n");
}

export function parseCsv(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") {
      quoted = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

function infer(token: string): unknown {
  const t = token.trim();
  if (t === "") return "";
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(t) && Math.abs(Number(t)) < 1e15) return Number(t);
  return token;
}

function assign(target: Record<string, unknown>, key: string, value: unknown, expand: boolean): void {
  if (!expand || !key.includes(".")) {
    target[key] = value;
    return;
  }
  const parts = key.split(".");
  let node: Record<string, unknown> = target;
  for (const part of parts.slice(0, -1)) {
    const next = node[part];
    if (next && typeof next === "object" && !Array.isArray(next)) node = next as Record<string, unknown>;
    else {
      const created: Record<string, unknown> = {};
      node[part] = created;
      node = created;
    }
  }
  node[parts[parts.length - 1]] = value;
}

export function csvToJson(text: string, opts: CsvToJsonOptions): unknown {
  const rows = parseCsv(text, opts.delimiter);
  if (rows.length === 0) return [];
  const headerRow = opts.header ? rows[0] : null;
  const width = Math.max(...rows.map((r) => r.length));
  const keys = headerRow
    ? Array.from({ length: width }, (_, i) => headerRow[i] ?? `column${i + 1}`)
    : Array.from({ length: width }, (_, i) => `column${i + 1}`);

  const seen = new Map<string, number>();
  for (let i = 0; i < keys.length; i++) {
    const count = seen.get(keys[i]) ?? 0;
    seen.set(keys[i], count + 1);
    if (count > 0) keys[i] = `${keys[i]}_${count + 1}`;
  }

  const body = headerRow ? rows.slice(1) : rows;
  return body.map((row) => {
    const record: Record<string, unknown> = {};
    for (let i = 0; i < keys.length; i++) {
      const raw = row[i] ?? "";
      const value = opts.inferTypes ? infer(raw) : raw;
      assign(record, keys[i], value, opts.expandDots);
    }
    return record;
  });
}
