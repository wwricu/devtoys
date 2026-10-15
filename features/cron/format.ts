/** Stable field identifiers; the display names live in locale.ts. */
export type CronFieldKey =
  | "second"
  | "minute"
  | "hour"
  | "dayOfMonth"
  | "month"
  | "dayOfWeek";

export interface CronField {
  key: CronFieldKey;
  min: number;
  max: number;
  values: number[];
}

/** Structured description of a field's value set, rendered by the component. */
export type FieldDescription =
  | { kind: "all" }
  | { kind: "days"; days: number[] }
  | { kind: "months"; months: number[] }
  | { kind: "many"; count: number; min: number; max: number }
  | { kind: "values"; values: number[] };

export interface FieldSummary {
  key: CronFieldKey;
  description: FieldDescription;
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
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const DOW_NAMES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

interface FieldDef {
  key: CronFieldKey;
  /** English name, only used inside parse error messages */
  name: string;
  min: number;
  max: number;
  names?: Record<string, number>;
}

const DEFS: FieldDef[] = [
  { key: "minute", name: "Minute", min: 0, max: 59 },
  { key: "hour", name: "Hour", min: 0, max: 23 },
  { key: "dayOfMonth", name: "Day of month", min: 1, max: 31 },
  { key: "month", name: "Month", min: 1, max: 12, names: MONTH_NAMES },
  {
    key: "dayOfWeek",
    name: "Day of week",
    min: 0,
    max: 7,
    names: DOW_NAMES,
  },
];

const SECOND_DEF: FieldDef = {
  key: "second",
  name: "Second",
  min: 0,
  max: 59,
};

function resolveToken(token: string, def: FieldDef): number {
  const lower = token.toLowerCase();
  if (def.names && lower in def.names) return def.names[lower];
  const n = Number(token);
  if (!Number.isInteger(n))
    throw new Error(
      `'${token}' is not a valid ${def.name.toLowerCase()} value`,
    );
  let v = n;
  if (def.name === "Day of week" && v === 7) v = 0;
  if (v < def.min || v > def.max)
    throw new Error(
      `${v} is out of range for ${def.name.toLowerCase()} (${def.min}-${def.max})`,
    );
  return v;
}

function parseField(raw: string, def: FieldDef): number[] {
  const out = new Set<number>();
  for (const part of raw.split(",")) {
    if (part === "")
      throw new Error(`Empty list item in ${def.name.toLowerCase()} field`);
    let body = part;
    let step = 1;
    const slash = body.split("/");
    if (slash.length > 2)
      throw new Error(`Multiple '/' in ${def.name.toLowerCase()} field`);
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
        throw new Error(
          `Bad range '${body}' in ${def.name.toLowerCase()} field`,
        );
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
    if (lo > hi)
      throw new Error(
        `Range '${body}' runs backwards in ${def.name.toLowerCase()} field`,
      );
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
      if (values.length === 0)
        throw new Error(`${def.name} field matches nothing`);
      fields.push({ key: def.key, min: def.min, max: def.max, values });
    }
  } catch (err) {
    return {
      spec: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return { spec: { hasSeconds, fields }, error: null };
}

function field(spec: CronSpec, key: CronFieldKey): CronField {
  return spec.fields.find((f) => f.key === key)!;
}

/** Vixie rule: when both day fields are restricted, either one may match. */
function dayMatches(spec: CronSpec, d: Date): boolean {
  const dom = field(spec, "dayOfMonth");
  const dow = field(spec, "dayOfWeek");
  const domStar = dom.values.length === dom.max - dom.min + 1;
  const dowStar = dow.values.length === 7;
  const okDom = dom.values.includes(d.getDate());
  const okDow = dow.values.includes(d.getDay());
  if (!domStar && !dowStar) return okDom || okDow;
  return okDom && okDow;
}

/** Next `count` fire times strictly after `from`. */
export function nextRuns(spec: CronSpec, from: Date, count: number): Date[] {
  const minutes = new Set(field(spec, "minute").values);
  const hours = new Set(field(spec, "hour").values);
  const months = new Set(field(spec, "month").values);
  const seconds = spec.hasSeconds
    ? new Set(field(spec, "second").values)
    : new Set([0]);
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

/**
 * Structured description of one field's value set. Turning it into text, and
 * naming weekdays and months, is up to the UI (see locale.ts).
 */
export function describeValues(field: CronField): FieldDescription {
  const span = field.key === "dayOfWeek" ? 7 : field.max - field.min + 1;
  if (field.values.length === span) return { kind: "all" };
  if (field.key === "dayOfWeek") return { kind: "days", days: field.values };
  if (field.key === "month") return { kind: "months", months: field.values };
  if (field.values.length > 12)
    return {
      kind: "many",
      count: field.values.length,
      min: field.min,
      max: field.max,
    };
  return { kind: "values", values: field.values };
}

/** One structured line per field, for the schedule description. */
export function describeCron(spec: CronSpec): FieldSummary[] {
  return spec.fields.map((f) => ({
    key: f.key,
    description: describeValues(f),
  }));
}
