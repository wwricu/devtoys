/**
 * Timezone math on top of the browser's own IANA database (ICU via Intl).
 * Nothing is bundled or fetched, so the data ages exactly as fast as the
 * browser's, and no table here can go stale on its own.
 */

export interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

/** "gap" = the wall time is skipped by a forward transition. */
export type WallStatus = "exact" | "ambiguous" | "gap";

export interface WallResolution {
  ms: number;
  status: WallStatus;
}

export interface DstInfo {
  /** The instant's offset is ahead of the zone's standard offset. */
  active: boolean;
  /** Offset in seconds east of UTC at the instant. */
  offset: number;
  /** Smallest offset seen around the wall year, in seconds east of UTC. */
  standard: number;
}

const HOUR_MS = 3_600_000;

const wallFormatters = new Map<string, Intl.DateTimeFormat>();
const nameFormatters = new Map<string, Intl.DateTimeFormat>();

function wallFormatter(zone: string): Intl.DateTimeFormat {
  const cached = wallFormatters.get(zone);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    era: "short",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  wallFormatters.set(zone, created);
  return created;
}

let systemCache: string | null = null;

export function systemZone(): string {
  if (systemCache) return systemCache;
  try {
    systemCache = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    systemCache = "UTC";
  }
  return systemCache;
}

export function isValidZone(zone: string): boolean {
  try {
    wallFormatter(zone);
    return true;
  } catch {
    return false;
  }
}

let zoneCache: string[] | null = null;

/** Canonical IANA ids, sorted, plus the system zone and UTC. */
export function supportedZones(): string[] {
  if (zoneCache) return zoneCache;
  const ids =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  zoneCache = [...new Set([...ids, systemZone(), "UTC"])].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
  return zoneCache;
}

/** Interpret a wall clock as UTC; years 0-99 stay literal. */
function toUtcMs(wall: WallParts): number {
  const date = new Date(0);
  date.setUTCFullYear(wall.year, wall.month - 1, wall.day);
  date.setUTCHours(wall.hour, wall.minute, wall.second, wall.millisecond);
  return date.getTime();
}

export function wallParts(ms: number, zone: string): WallParts {
  const stamp = Math.trunc(ms);
  const parts = wallFormatter(zone).formatToParts(new Date(stamp));
  const pick = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  // Without an era the proleptic year 0 formats as "1"; ICU spells it 1 BC.
  const bc = parts.some((part) => part.type === "era" && part.value === "BC");
  return {
    year: bc ? 1 - pick("year") : pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour") % 24,
    minute: pick("minute"),
    second: pick("second"),
    millisecond: ((stamp % 1000) + 1000) % 1000,
  };
}

/** Offset in seconds east of UTC at an instant. */
export function offsetSeconds(ms: number, zone: string): number {
  const wall = wallParts(ms, zone);
  const second = Math.floor(ms / 1000) * 1000;
  return Math.round((toUtcMs(wall) - wall.millisecond - second) / 1000);
}

function sameWall(a: WallParts, b: WallParts): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

/**
 * Map a wall clock in a zone to an instant, disambiguating the way Temporal's
 * "compatible" mode does: a repeated wall time takes the earlier occurrence, a
 * skipped one moves forward by the gap. Candidates are validated by
 * round-tripping through the zone, which also rejects fake matches around a
 * skipped calendar day.
 */
export function resolveWall(wall: WallParts, zone: string): WallResolution {
  const guess = toUtcMs(wall);
  const offsets = new Set([
    offsetSeconds(guess - 24 * HOUR_MS, zone),
    offsetSeconds(guess, zone),
    offsetSeconds(guess + 24 * HOUR_MS, zone),
  ]);
  const matches: number[] = [];
  for (const offset of offsets) {
    const candidate = guess - offset * 1000;
    if (sameWall(wallParts(candidate, zone), wall)) matches.push(candidate);
  }
  if (matches.length > 0) {
    return {
      ms: Math.min(...matches),
      status: matches.length > 1 ? "ambiguous" : "exact",
    };
  }
  // Skipped by a forward transition: reuse the pre-transition offset, which
  // lands the same clock time after the gap.
  const before = offsetSeconds(guess - 24 * HOUR_MS, zone);
  return { ms: guess - before * 1000, status: "gap" };
}

/**
 * DST has no Intl flag, so compare the instant's offset with the year's
 * smallest offset (Jan/Jul samples). This reports "daylight saving in effect"
 * as users understand it; negative-DST schemes (Morocco's Ramadan) therefore
 * read as off during the split, which is what the wall clock does.
 */
export function dstInfo(ms: number, zone: string): DstInfo {
  const offset = offsetSeconds(ms, zone);
  const { year } = wallParts(ms, zone);
  const sample = (month: number): number =>
    offsetSeconds(
      toUtcMs({
        year,
        month,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      }),
      zone,
    );
  const standard = Math.min(sample(1), sample(7));
  return { active: offset > standard, offset, standard };
}

export function zoneAbbreviation(ms: number, zone: string): string {
  let formatter = nameFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "short",
    });
    nameFormatters.set(zone, formatter);
  }
  const part = formatter
    .formatToParts(new Date(ms))
    .find((item) => item.type === "timeZoneName");
  return part?.value ?? "";
}

/** "UTC+08:00" style; seconds are rounded away for display. */
export function formatOffset(offset: number): string {
  const minutes = Math.round(offset / 60);
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
