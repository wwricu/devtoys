import {
  dstInfo,
  formatOffset,
  offsetSeconds,
  resolveWall,
  wallParts,
  zoneAbbreviation,
  type WallStatus,
} from "./zone";

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
  /** How a wall-clock input landed on the timeline. */
  status: WallStatus | null;
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

function emptyResult(): ParseResult {
  return {
    ms: null,
    ns: null,
    kind: "empty",
    unit: null,
    status: null,
    error: null,
  };
}

function fail(
  kind: InputKind,
  error: "range" | "unrecognized",
  unit: TimeUnit | null = null,
): ParseResult {
  return { ms: null, ns: null, kind, unit, status: null, error };
}

/** Wrap a parsed epoch value, rejecting dates the Date object cannot hold. */
function toResult(ms: number, kind: InputKind, status: WallStatus): ParseResult {
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) {
    return fail(kind, "range");
  }
  return {
    ms,
    ns: BigInt(Math.trunc(ms)) * 1_000_000n,
    kind,
    unit: null,
    status,
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

/**
 * Validate calendar fields; null means at least one is out of range. Text
 * without an explicit offset is read on the selected zone's wall clock.
 */
function buildEpoch(
  parts: DateParts,
  offsetMinutes: number | null,
  zone: string,
): { ms: number; status: WallStatus } | null {
  const { year, month, day, hour, minute, second, milli } = parts;
  if (year < 0 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  if (offsetMinutes === null) {
    return resolveWall(
      { year, month, day, hour, minute, second, millisecond: milli },
      zone,
    );
  }
  return {
    ms:
      makeUtc(year, month, day, hour, minute, second, milli) -
      offsetMinutes * 60_000,
    status: "exact",
  };
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

type Match =
  | { ms: number; kind: InputKind; status: WallStatus }
  | "invalid"
  | null;

function matchIso(text: string, zone: string): Match {
  const m = DATE_RE.exec(text);
  if (!m) return null;
  const [, year, month, day, hour = "0", minute = "0", second = "0", frac = "", tz] = m;
  const offset = tz ? parseOffset(tz) : null;
  if (tz && offset === null) return "invalid";
  const built = buildEpoch(
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
    zone,
  );
  if (built === null) return "invalid";
  return {
    ms: built.ms,
    kind: text.includes("/") ? "local" : "iso",
    status: built.status,
  };
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
  const built = buildEpoch(
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
    "UTC",
  );
  if (built === null) return "invalid";
  return { ms: built.ms, kind: "rfc2822", status: "exact" };
}

/**
 * Parse a numeric Unix timestamp. "auto" picks seconds/millis/micros/nanos by
 * magnitude, so 10-digit values stay seconds and 19-digit ones stay nanos.
 */
export function parseTimestamp(raw: string, unit: TimeUnit): ParseResult {
  const text = raw.trim();
  if (text === "") return emptyResult();
  if (!NUMERIC_RE.test(text)) return fail("timestamp", "unrecognized");
  const value = Number(text);
  if (!Number.isFinite(value)) return fail("timestamp", "range");
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
  if (Math.abs(ms) > MAX_DATE_MS) return fail("timestamp", "range", resolved);
  return { ms, ns, kind: "timestamp", unit: resolved, status: "exact", error: null };
}

/**
 * Parse ISO 8601 (also `YYYY/MM/DD`, `T` or space), then RFC 2822 / HTTP date.
 * Zone-less text is read on the given zone's clock; no browser Date.parse
 * fallback, which would silently guess the machine's zone.
 */
export function parseDateText(raw: string, zone: string): ParseResult {
  const text = raw.trim();
  if (text === "") return emptyResult();

  const iso = matchIso(text, zone);
  if (iso === "invalid") return fail("iso", "unrecognized");
  if (iso) return toResult(iso.ms, iso.kind, iso.status);

  const rfc = matchRfc2822(text);
  if (rfc === "invalid") return fail("rfc2822", "unrecognized");
  if (rfc) return toResult(rfc.ms, rfc.kind, rfc.status);

  return fail("other", "unrecognized");
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

const padYear = (year: number) =>
  year < 0 ? `-${pad(-year, 4)}` : pad(year, 4);

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
  isoZoned: string;
  rfc2822: string;
  httpDate: string;
  sql: string;
  local: string;
  weekday: number;
  timezone: string;
  offset: string;
  abbreviation: string;
  dst: boolean;
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

function weekdayOf(year: number, month: number, day: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCDay();
}

const localeFormatters = new Map<string, Intl.DateTimeFormat>();

function localeString(ms: number, zone: string): string {
  let formatter = localeFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: zone,
      dateStyle: "medium",
      timeStyle: "medium",
    });
    localeFormatters.set(zone, formatter);
  }
  return formatter.format(new Date(ms));
}

/** RFC 2822 only allows ±HHMM, so seconds are rounded away. */
function rfcOffset(offset: number): string {
  const minutes = Math.round(offset / 60);
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
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

/**
 * Render an instant in the selected zone. Absolute outputs (UTC, HTTP, Unix,
 * ticks) ignore the zone; wall-clock outputs follow it.
 */
export function formatDate(
  ms: number,
  ns: bigint | null,
  zone: string,
  now = Date.now(),
): DateFields {
  const stamp = ns ?? BigInt(Math.trunc(ms)) * 1_000_000n;
  const wall = wallParts(ms, zone);
  const offset = offsetSeconds(ms, zone);
  const offsetLabel = formatOffset(offset);
  const ymd = `${padYear(wall.year)}-${pad(wall.month)}-${pad(wall.day)}`;
  const hms = `${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}`;
  const weekday = weekdayOf(wall.year, wall.month, wall.day);
  const dst = dstInfo(ms, zone);
  return {
    isoUtc: new Date(Math.trunc(ms)).toISOString(),
    isoZoned: `${ymd}T${hms}.${pad(wall.millisecond, 3)}${offsetLabel.slice(3)}`,
    rfc2822: `${WEEKDAY_SHORT[weekday]}, ${pad(wall.day)} ${
      MONTH_SHORT[wall.month - 1]
    } ${padYear(wall.year)} ${hms} ${rfcOffset(offset)}`,
    httpDate: new Date(Math.trunc(ms)).toUTCString(),
    sql: `${ymd} ${hms}`,
    local: localeString(ms, zone),
    weekday,
    timezone: zone,
    offset: offsetLabel,
    abbreviation: zoneAbbreviation(ms, zone),
    dst: dst.active,
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
