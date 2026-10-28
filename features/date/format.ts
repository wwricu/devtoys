export type TimeUnit = "auto" | "s" | "ms" | "us" | "ns";

export type InputKind =
  | "timestamp"
  | "iso"
  | "rfc2822"
  | "local"
  | "other"
  | "empty";

export interface ParseResult {
  /** Whole milliseconds since the epoch; null when the input is empty/invalid. */
  ms: number | null;
  /** Exact nanoseconds for numeric input, so micro/nano outputs keep precision. */
  ns: bigint | null;
  /** Which format the text was recognized as. */
  kind: InputKind;
  /** Resolved unit for numeric input only. */
  unit: TimeUnit | null;
  error: "range" | "unrecognized" | null;
}

/** ECMAScript Date limit: ±100,000,000 days around the epoch. */
const MAX_DATE_MS = 8.64e15;

const NUMERIC_RE = /^[+-]?\d+(?:\.\d+)?$/;

function decimalToNs(raw: string, unit: Exclude<TimeUnit, "auto">): bigint {
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = raw.replace(/^[+-]/, "").split(".");
  const factor =
    unit === "s"
      ? 1_000_000_000n
      : unit === "ms"
        ? 1_000_000n
        : unit === "us"
          ? 1_000n
          : 1n;
  const scale = 10n ** BigInt(fraction.length);
  const total =
    BigInt(whole || "0") * factor +
    (fraction ? (BigInt(fraction) * factor) / scale : 0n);
  return negative ? -total : total;
}

function rangeError(kind: InputKind, unit: TimeUnit | null): ParseResult {
  return { ms: null, ns: null, kind, unit, error: "range" };
}

/** Wrap a parsed epoch value, rejecting dates the Date object cannot hold. */
function toResult(ms: number, kind: InputKind): ParseResult {
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) {
    return rangeError(kind, null);
  }
  return {
    ms: Math.trunc(ms),
    ns: BigInt(Math.trunc(ms)) * 1_000_000n,
    kind,
    unit: null,
    error: null,
  };
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month1: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month1 - 1];
}

function makeUtc(
  year: number,
  month1: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  milli: number,
): number {
  const date = new Date(
    Date.UTC(2000, month1 - 1, day, hour, minute, second, milli),
  );
  // setUTCFullYear keeps years 0-99 literal; Date.UTC would map them to 1900+.
  date.setUTCFullYear(year);
  return date.getTime();
}

function makeLocal(
  year: number,
  month1: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  milli: number,
): number {
  const date = new Date(
    2000,
    month1 - 1,
    day,
    hour,
    minute,
    second,
    milli,
  );
  date.setFullYear(year);
  return date.getTime();
}

/** Offset in minutes east of UTC, or null when the zone text is invalid. */
function parseOffset(tz: string): number | null {
  if (/^(z|gmt|utc|ut)$/i.test(tz)) return 0;
  const m = /^([+-])(\d{2})(?::?(\d{2}))?$/.exec(tz);
  if (!m) return null;
  const hours = Number(m[2]);
  const minutes = Number(m[3] ?? "0");
  if (hours > 23 || minutes > 59) return null;
  return (m[1] === "-" ? -1 : 1) * (hours * 60 + minutes);
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  milli: number;
}

/** Validate calendar fields; null means at least one is out of range. */
function buildEpoch(parts: DateParts, offsetMinutes: number | null): number | null {
  const { year, month, day, hour, minute, second, milli } = parts;
  if (year < 0 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  if (offsetMinutes === null) {
    return makeLocal(year, month, day, hour, minute, second, milli);
  }
  return (
    makeUtc(year, month, day, hour, minute, second, milli) -
    offsetMinutes * 60_000
  );
}

const DATE_RE =
  /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?)?$/i;

const WEEKDAY_NAMES = "Mon|Tue|Wed|Thu|Fri|Sat|Sun";
const MONTH_NAMES = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const MONTH_INDEX: Record<string, number> = {
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

const RFC_RE = new RegExp(
  `^(?:(?:${WEEKDAY_NAMES})\\s*,?\\s+)?(\\d{1,2})\\s+(${MONTH_NAMES})\\s+(\\d{2}|\\d{4})\\s+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s+(GMT|UTC|UT|Z|[+-]\\d{2}:?\\d{2})$`,
  "i",
);

type Match = { ms: number; kind: InputKind } | "invalid" | null;

function matchIso(text: string): Match {
  const m = DATE_RE.exec(text);
  if (!m) return null;
  const [, year, month, day, hour = "0", minute = "0", second = "0", frac = "", tz] = m;
  const offset = tz ? parseOffset(tz) : null;
  if (tz && offset === null) return "invalid";
  const ms = buildEpoch(
    {
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
      milli: frac ? Number(frac.padEnd(3, "0").slice(0, 3)) : 0,
    },
    offset,
  );
  if (ms === null) return "invalid";
  return { ms, kind: text.includes("/") ? "local" : "iso" };
}

function matchRfc2822(text: string): Match {
  const m = RFC_RE.exec(text);
  if (!m) return null;
  const [, day, monthName, yearText, hour, minute, second = "0", tz] = m;
  const offset = parseOffset(tz);
  if (offset === null) return "invalid";
  const shortYear = Number(yearText);
  const year =
    yearText.length === 4
      ? shortYear
      : shortYear < 50
        ? 2000 + shortYear
        : 1900 + shortYear;
  const ms = buildEpoch(
    {
      year,
      month: MONTH_INDEX[monthName.toLowerCase()],
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
      milli: 0,
    },
    offset,
  );
  if (ms === null) return "invalid";
  return { ms, kind: "rfc2822" };
}

/**
 * Recognize the supported input formats, in order: numeric timestamp, ISO 8601
 * (also `YYYY/MM/DD`, `T` or space), RFC 2822 / HTTP date, then the browser's
 * own parser as a last resort.
 */
export function parseInput(raw: string, unit: TimeUnit): ParseResult {
  const text = raw.trim();
  if (text === "") {
    return { ms: null, ns: null, kind: "empty", unit: null, error: null };
  }

  if (NUMERIC_RE.test(text)) {
    const value = Number(text);
    if (!Number.isFinite(value)) return rangeError("timestamp", null);
    const abs = Math.abs(value);
    const resolved =
      unit !== "auto"
        ? unit
        : abs < 1e11
          ? "s"
          : abs < 1e14
            ? "ms"
            : abs < 1e17
              ? "us"
              : "ns";
    const ns = decimalToNs(text, resolved);
    const ms = Number(ns / 1_000_000n);
    if (Math.abs(ms) > MAX_DATE_MS) return rangeError("timestamp", resolved);
    return { ms, ns, kind: "timestamp", unit: resolved, error: null };
  }

  const iso = matchIso(text);
  if (iso === "invalid") {
    return { ms: null, ns: null, kind: "iso", unit: null, error: "unrecognized" };
  }
  if (iso) return toResult(iso.ms, iso.kind);

  const rfc = matchRfc2822(text);
  if (rfc === "invalid") {
    return {
      ms: null,
      ns: null,
      kind: "rfc2822",
      unit: null,
      error: "unrecognized",
    };
  }
  if (rfc) return toResult(rfc.ms, rfc.kind);

  const fallback = Date.parse(text);
  if (!Number.isNaN(fallback)) return toResult(fallback, "other");

  return { ms: null, ns: null, kind: "other", unit: null, error: "unrecognized" };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Day of week as a numeric index; the component maps it through the locale. */
export interface DateFields {
  isoUtc: string;
  isoLocal: string;
  rfc2822: string;
  httpDate: string;
  sql: string;
  local: string;
  weekday: number;
  timezone: string;
  offset: string;
  unixSeconds: string;
  unixMillis: string;
  unixMicros: string;
  unixNanos: string;
  dotnetTicks: string;
  relative: RelativeParts;
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

export function formatDate(
  ms: number,
  ns: bigint | null,
  now = Date.now(),
): DateFields {
  const stamp = ns ?? BigInt(Math.trunc(ms)) * 1_000_000n;
  const d = new Date(Math.trunc(ms));
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const ymd = `${String(d.getFullYear()).padStart(4, "0")}-${pad(
    d.getMonth() + 1,
  )}-${pad(d.getDate())}`;
  const hms = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const offset = offsetString(d);
  return {
    isoUtc: d.toISOString(),
    isoLocal: `${ymd}T${hms}.${pad(d.getMilliseconds(), 3)}${offset.slice(3)}`,
    rfc2822: `${WEEKDAY_SHORT[d.getDay()]}, ${pad(d.getDate())} ${
      MONTH_SHORT[d.getMonth()]
    } ${String(d.getFullYear()).padStart(4, "0")} ${hms} ${offset
      .slice(3)
      .replace(":", "")}`,
    httpDate: d.toUTCString(),
    sql: `${ymd} ${hms}`,
    local: d.toLocaleString(),
    weekday: d.getDay(),
    timezone,
    offset,
    unixSeconds: (stamp / 1_000_000_000n).toString(),
    unixMillis: (stamp / 1_000_000n).toString(),
    unixMicros: (stamp / 1_000n).toString(),
    unixNanos: stamp.toString(),
    dotnetTicks: (
      stamp / 100n +
      BigInt("621355968000000000")
    ).toString(),
    relative: relativeTime(Math.trunc(ms), now),
  };
}
