export interface CronField {
  name: string;
  min: number;
  max: number;
  values: number[];
}

export interface CronSpec {
  hasSeconds: boolean;
  fields: CronField[];
}

export interface CronResult {
  spec: CronSpec | null;
  error: string | null;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DOW_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

interface FieldDef {
  name: string;
  min: number;
  max: number;
  names?: Record<string, number>;
}

const DEFS: FieldDef[] = [
  { name: "Minute", min: 0, max: 59 },
  { name: "Hour", min: 0, max: 23 },
  { name: "Day of month", min: 1, max: 31 },
  { name: "Month", min: 1, max: 12, names: MONTH_NAMES },
  { name: "Day of week", min: 0, max: 7, names: DOW_NAMES },
];

const SECOND_DEF: FieldDef = { name: "Second", min: 0, max: 59 };

function resolveToken(token: string, def: FieldDef): number {
  const lower = token.toLowerCase();
  if (def.names && lower in def.names) return def.names[lower];
  const n = Number(token);
  if (!Number.isInteger(n)) throw new Error(`'${token}' is not a valid ${def.name.toLowerCase()} value`);
  let v = n;
  if (def.name === "Day of week" && v === 7) v = 0;
  if (v < def.min || v > def.max)
    throw new Error(`${v} is out of range for ${def.name.toLowerCase()} (${def.min}-${def.max})`);
  return v;
}

function parseField(raw: string, def: FieldDef): number[] {
  const out = new Set<number>();
  for (const part of raw.split(",")) {
    if (part === "") throw new Error(`Empty list item in ${def.name.toLowerCase()} field`);
    let body = part;
    let step = 1;
    const slash = body.split("/");
    if (slash.length > 2) throw new Error(`Multiple '/' in ${def.name.toLowerCase()} field`);
    if (slash.length === 2) {
      body = slash[0];
      step = Number(slash[1]);
      if (!Number.isInteger(step) || step <= 0)
        throw new Error(`Step '${slash[1]}' must be a positive integer`);
    }
    let lo: number;
    let hi: number;
    if (body === "*") {
      lo = def.min;
      hi = def.max;
    } else if (body.includes("-")) {
      const [a, b] = body.split("-");
      if (b === undefined || a === undefined || a === "" || b === "")
        throw new Error(`Bad range '${body}' in ${def.name.toLowerCase()} field`);
      lo = resolveToken(a, def);
      hi = resolveToken(b, def);
    } else {
      if (slash.length === 2 && body !== "*") {
        // "5/10" means starting at 5, stepping to the end of the range
        lo = resolveToken(body, def);
        hi = def.max;
      } else {
        lo = resolveToken(body, def);
        hi = lo;
      }
    }
    if (lo > hi) throw new Error(`Range '${body}' runs backwards in ${def.name.toLowerCase()} field`);
    for (let v = lo; v <= hi; v += step) {
      if (def.name === "Day of week" && v === 7) out.add(0);
      else out.add(v);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** Parse 5-field cron, or 6-field when a seconds field is present. */
export function parseCron(expression: string): CronResult {
  const raw = expression.trim();
  if (raw === "") return { spec: null, error: null };
  const parts = raw.split(/\s+/);
  if (parts.length < 5 || parts.length > 6)
    return {
      spec: null,
      error: `Expected 5 or 6 space-separated fields, got ${parts.length}`,
    };

  const hasSeconds = parts.length === 6;
  const defs = hasSeconds ? [SECOND_DEF, ...DEFS] : DEFS;
  const fields: CronField[] = [];
  try {
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const values = parseField(parts[i], def);
      if (values.length === 0) throw new Error(`${def.name} field matches nothing`);
      fields.push({ name: def.name, min: def.min, max: def.max, values });
    }
  } catch (err) {
    return {
      spec: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return { spec: { hasSeconds, fields }, error: null };
}

function field(spec: CronSpec, name: string): CronField {
  return spec.fields.find((f) => f.name === name)!;
}

/** Vixie rule: when both day fields are restricted, either one may match. */
function dayMatches(spec: CronSpec, d: Date): boolean {
  const dom = field(spec, "Day of month");
  const dow = field(spec, "Day of week");
  const domStar = dom.values.length === dom.max - dom.min + 1;
  const dowStar = dow.values.length === 7;
  const okDom = dom.values.includes(d.getDate());
  const okDow = dow.values.includes(d.getDay());
  if (!domStar && !dowStar) return okDom || okDow;
  return okDom && okDow;
}

/** Next `count` fire times strictly after `from`. */
export function nextRuns(spec: CronSpec, from: Date, count: number): Date[] {
  const minutes = new Set(field(spec, "Minute").values);
  const hours = new Set(field(spec, "Hour").values);
  const months = new Set(field(spec, "Month").values);
  const seconds = spec.hasSeconds ? new Set(field(spec, "Second").values) : new Set([0]);
  const secStep = spec.hasSeconds ? 1000 : 60000;

  const d = new Date(from.getTime() + 1000);
  d.setMilliseconds(0);
  if (!spec.hasSeconds) d.setSeconds(0);

  const out: Date[] = [];
  // Search window: ~4 years, enough for "Feb 29 on a Monday" style expressions.
  const limit = from.getTime() + 1000 * 60 * 60 * 24 * 366 * 4;

  while (d.getTime() < limit && out.length < count) {
    if (!months.has(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!dayMatches(spec, d)) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!hours.has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!minutes.has(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
      continue;
    }
    if (!seconds.has(d.getSeconds())) {
      d.setTime(d.getTime() + secStep);
      continue;
    }
    out.push(new Date(d.getTime()));
    d.setTime(d.getTime() + secStep);
  }
  return out;
}

function summarize(values: number[], def: FieldDef, every: boolean): string {
  if (every) return `every ${def.name.toLowerCase()}`;
  if (def.name === "Day of week") return values.map((v) => DOW_LABELS[v]).join(", ");
  if (def.name === "Month") return values.map((v) => MONTH_LABELS[v - 1]).join(", ");
  if (values.length > 12) return `${values.length} of ${def.min}-${def.max}`;
  return values.join(", ");
}

export function formatFieldValues(field: CronField): string {
  const span = field.name === "Day of week" ? 7 : field.max - field.min + 1;
  if (field.values.length === span) return `every ${field.name.toLowerCase()}`;
  const def = { name: field.name, min: field.min, max: field.max };
  return summarize(field.values, def, false);
}

export function describeCron(spec: CronSpec): string[] {
  const lines: string[] = [];
  for (const f of spec.fields) lines.push(`${f.name}: ${formatFieldValues(f)}`);
  return lines;
}

export const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
