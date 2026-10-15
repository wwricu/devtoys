export type TimeUnit = "auto" | "s" | "ms" | "us" | "ns";

export interface TimestampResult {
  ms: number | null;
  detectedUnit?: TimeUnit;
  error: string | null;
}

/** Convert a raw timestamp value in the given unit to milliseconds since epoch. */
export function timestampToMs(raw: string, unit: TimeUnit): TimestampResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ms: null, error: null };
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { ms: null, error: "Timestamp must be a number" };
  }
  const value = Number(trimmed);
  const abs = Math.abs(value);
  let resolved: TimeUnit;
  if (unit !== "auto") {
    resolved = unit;
  } else {
    resolved = abs < 1e11 ? "s" : abs < 1e14 ? "ms" : abs < 1e17 ? "us" : "ns";
  }
  let ms: number;
  switch (resolved) {
    case "s":
      ms = value * 1000;
      break;
    case "ms":
      ms = value;
      break;
    case "us":
      ms = value / 1000;
      break;
    case "ns":
      ms = value / 1e6;
      break;
    default:
      ms = value;
  }
  if (!Number.isFinite(ms)) {
    return { ms: null, error: "Value out of range" };
  }
  return { ms, detectedUnit: resolved, error: null };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Day of week as a numeric index; the component maps it through the locale. */
export interface DateFields {
  isoUtc: string;
  isoLocal: string;
  utc: string;
  local: string;
  weekday: number;
  timezone: string;
  offset: string;
  unixSeconds: string;
  unixMillis: string;
  unixMicros: string;
  unixNanos: string;
  relative: RelativeParts;
  calendar: string;
  ymd: string;
  hms: string;
}

export type RelativeUnit =
  | "millisecond"
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

/** Structured relative time; the sentence is composed in the component. */
export interface RelativeParts {
  count: number;
  unit: RelativeUnit;
  past: boolean;
}

function offsetString(date: Date): string {
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function relativeTime(ms: number, now = Date.now()): RelativeParts {
  const diff = ms - now;
  const past = diff < 0;
  const a = Math.abs(diff);
  const units: [number, RelativeUnit][] = [
    [1000, "millisecond"],
    [1000, "second"],
    [60, "minute"],
    [60, "hour"],
    [24, "day"],
    [7, "week"],
    [4.34524, "month"],
    [12, "year"],
  ];
  // threshold in ms for each unit size
  const sizes = [
    1, 1000, 60_000, 3_600_000, 86_400_000, 604_800_000, 2_629_800_000,
    31_557_600_000,
  ];
  let chosen: RelativeUnit = "millisecond";
  let count = a;
  for (let i = sizes.length - 1; i >= 0; i--) {
    if (a >= sizes[i]) {
      chosen = units[i][1];
      count = a / sizes[i];
      break;
    }
  }
  return { count: Math.floor(count), unit: chosen, past };
}

export function formatDate(ms: number): DateFields {
  const d = new Date(ms);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hms = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds(),
  )}`;
  const calendar = `${ymd} ${hms}`;
  return {
    isoUtc: d.toISOString(),
    isoLocal: `${ymd}T${hms}.${pad(d.getMilliseconds(), 3)}${offsetString(
      d,
    ).slice(3)}`,
    utc: d.toUTCString(),
    local: d.toLocaleString(),
    weekday: d.getDay(),
    timezone: tz,
    offset: offsetString(d),
    unixSeconds: String(Math.floor(ms / 1000)),
    unixMillis: String(Math.floor(ms)),
    unixMicros: String(BigInt(Math.floor(ms)) * BigInt(1000)),
    unixNanos: String(BigInt(Math.floor(ms)) * BigInt(1000000)),
    relative: relativeTime(ms),
    calendar,
    ymd,
    hms,
  };
}

const DATE_RE =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d{1,9}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/;

/** Parse a date string (ISO or 'YYYY-MM-DD HH:mm:ss'). No TZ => local time. */
export function parseDateString(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  const m = DATE_RE.exec(s);
  if (m) {
    const [, y, mo, da, h = "0", mi = "0", se = "0", frac = "", tz] = m;
    const ms = frac ? Number(("." + frac).slice(1)) * 1000 : 0;
    const year = Number(y);
    const month = Number(mo) - 1;
    const day = Number(da);
    const hour = Number(h);
    const min = Number(mi);
    const sec = Number(se);
    let offsetMin = 0;
    let asUtc = false;
    if (tz) {
      asUtc = true;
      if (tz === "Z") offsetMin = 0;
      else {
        const sign = tz[0] === "-" ? -1 : 1;
        const digits = tz.slice(1).replace(":", "");
        offsetMin =
          sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2)));
      }
    }
    if (asUtc) {
      return (
        Date.UTC(year, month, day, hour, min, sec) + ms - offsetMin * 60_000
      );
    }
    return new Date(year, month, day, hour, min, sec, ms).getTime();
  }
  const fallback = Date.parse(s);
  return Number.isNaN(fallback) ? null : fallback;
}
