"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Segmented, ToolButton, useStoredState } from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  formatDate,
  parseDateText,
  parseTimestamp,
  type RelativeUnit,
  type RelativeParts,
  type TimeUnit,
} from "./format";
import {
  formatOffset,
  isValidZone,
  offsetSeconds,
  resolveWall,
  supportedZones,
  systemZone,
  wallParts,
  zoneAbbreviation,
  zoneOptionLabel,
  type WallParts,
  type WallStatus,
} from "./zone";
import { strings } from "./locale";

/** Layout effects only exist in the browser; the server pass stays quiet. */
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type ParseError = "range" | "unrecognized" | null;

interface Instant {
  ms: number;
  ns: bigint;
  /** Unit the timestamp field renders; text and wall entries use millis. */
  unit: Exclude<TimeUnit, "auto">;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

const formatYear = (year: number) =>
  year < 0 ? `-${pad(-year, 4)}` : pad(year, 4);

function stampText(instant: Instant, unit: TimeUnit): string {
  const resolved = unit === "auto" ? instant.unit : unit;
  switch (resolved) {
    case "s":
      return (instant.ns / 1_000_000_000n).toString();
    case "us":
      return (instant.ns / 1_000n).toString();
    case "ns":
      return instant.ns.toString();
    default:
      return String(instant.ms);
  }
}

function Field({ label, value }: { label: string; value: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      /* ignore */
    }
  }, [value]);
  return (
    <div className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1 last:border-0 dark:border-neutral-800">
      <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <button
        type="button"
        onClick={copy}
        title={copied ? t.copied : value}
        className="min-w-0 flex-1 truncate rounded px-1 text-right font-mono text-xs text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        {copied ? t.copied : value || "—"}
      </button>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex shrink-0 flex-col overflow-hidden rounded border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex h-8 shrink-0 items-center border-b border-neutral-200 bg-neutral-50 px-2 dark:border-neutral-800 dark:bg-neutral-800/60">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </span>
      </header>
      <div className="flex flex-col gap-2 p-2">{children}</div>
    </section>
  );
}

const inputClass =
  "rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

const labelClass =
  "w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400";

/** Environment reads that only exist in the browser, without a mount effect. */
const noSubscription = () => () => {};
const serverZones = ["UTC"];

export default function DateConverter() {
  const { t } = useLang();
  const L = useText(strings);
  const [unit, setUnit] = useStoredState<TimeUnit>("date.unit", "auto");
  const [zone, setZone] = useStoredState<string>("date.zone", "");
  const system = useSyncExternalStore(noSubscription, systemZone, () => "UTC");
  const zoneOptions = useSyncExternalStore(
    noSubscription,
    supportedZones,
    () => serverZones,
  );
  const [instant, setInstant] = useState<Instant | null>(null);
  const [tsDraft, setTsDraft] = useState<string | null>(null);
  const [isoDraft, setIsoDraft] = useState<string | null>(null);
  const [tsError, setTsError] = useState<ParseError>(null);
  const [isoError, setIsoError] = useState<ParseError>(null);
  const [notice, setNotice] = useState<WallStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // The server has no clock, so the first render stays empty and this fills it
  // before the first hydrated paint. Runs once; later edits and the ticking
  // clock must not pull the fields back to "now".
  const seeded = useRef(false);
  useClientLayoutEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    setInstant((prev) => {
      if (prev) return prev;
      const ms = Date.now();
      return { ms, ns: BigInt(ms) * 1_000_000n, unit: "ms" };
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const zoneId = useMemo(() => {
    if (zone && isValidZone(zone)) return zone;
    return system;
  }, [zone, system]);

  const options = useMemo(
    () =>
      zoneOptions.includes(zoneId) ? zoneOptions : [zoneId, ...zoneOptions],
    [zoneOptions, zoneId],
  );

  // Labels carry each zone's offset at the displayed instant; the minute bucket
  // keeps the 419-zone sweep off the per-second clock re-render.
  const labelAnchor = Math.floor((instant?.ms ?? now) / 60_000) * 60_000;
  const optionLabels = useMemo(
    () => new Map(options.map((id) => [id, zoneOptionLabel(labelAnchor, id)])),
    [options, labelAnchor],
  );

  const zoneOffset = offsetSeconds(instant?.ms ?? now, zoneId);
  const zoneName = zoneAbbreviation(instant?.ms ?? now, zoneId);

  const unitOptions: { value: TimeUnit; label: string }[] = [
    { value: "auto", label: L.auto },
    { value: "s", label: L.secondsShort },
    { value: "ms", label: L.millisShort },
    { value: "us", label: L.microsShort },
    { value: "ns", label: L.nanosShort },
  ];
  const unitLabels: Record<Exclude<TimeUnit, "auto">, string> = {
    s: L.seconds,
    ms: L.millis,
    us: L.micros,
    ns: L.nanos,
  };

  const dayNames = [
    L.daySunday,
    L.dayMonday,
    L.dayTuesday,
    L.dayWednesday,
    L.dayThursday,
    L.dayFriday,
    L.daySaturday,
  ];

  const unitWords: Record<RelativeUnit, [string, string]> = {
    millisecond: [L.unitMillisecond, L.unitMillisecondPlural],
    second: [L.unitSecond, L.unitSecondPlural],
    minute: [L.unitMinute, L.unitMinutePlural],
    hour: [L.unitHour, L.unitHourPlural],
    day: [L.unitDay, L.unitDayPlural],
    week: [L.unitWeek, L.unitWeekPlural],
    month: [L.unitMonth, L.unitMonthPlural],
    year: [L.unitYear, L.unitYearPlural],
  };

  const relativeText = (r: RelativeParts) => {
    const [one, many] = unitWords[r.unit];
    const word = r.count === 1 ? one : many;
    return fill(r.past ? L.ago : L.later, { count: r.count, unit: word });
  };

  const fields = useMemo(
    () => (instant ? formatDate(instant.ms, instant.ns, zoneId, now) : null),
    [instant, zoneId, now],
  );
  const wall = useMemo(
    () => (instant ? wallParts(instant.ms, zoneId) : null),
    [instant, zoneId],
  );

  // The stored instant renders canonically; only an untouched or rejected
  // edit keeps a draft, so external changes (zone, now, wall clock) win.
  const tsCanonical = instant ? stampText(instant, unit) : "";
  const tsValue = tsDraft ?? tsCanonical;
  const isoCanonical = fields?.isoZoned ?? "";
  const isoValue = isoDraft ?? isoCanonical;

  const tsLive = useMemo(() => parseTimestamp(tsValue, unit), [tsValue, unit]);
  const detected =
    unit === "auto" && !tsLive.error && tsLive.unit && tsLive.unit !== "auto"
      ? unitLabels[tsLive.unit]
      : null;

  const dateValue = wall
    ? `${formatYear(wall.year)}-${pad(wall.month)}-${pad(wall.day)}`
    : "";
  const timeValue = wall
    ? `${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}`
    : "";

  const clearAll = () => {
    setInstant(null);
    setTsDraft(null);
    setIsoDraft(null);
    setTsError(null);
    setIsoError(null);
    setNotice(null);
  };

  const useNow = () => {
    const ms = Date.now();
    setInstant({ ms, ns: BigInt(ms) * 1_000_000n, unit: "ms" });
    setTsDraft(null);
    setIsoDraft(null);
    setTsError(null);
    setIsoError(null);
    setNotice(null);
  };

  const commitTimestamp = () => {
    const text = tsDraft ?? tsCanonical;
    if (text.trim() === "") {
      clearAll();
      return;
    }
    const result = parseTimestamp(text, unit);
    if (result.ms === null || result.ns === null) {
      setTsError(result.error ?? "unrecognized");
      return;
    }
    setInstant({
      ms: result.ms,
      ns: result.ns,
      unit: (result.unit ?? "ms") as Exclude<TimeUnit, "auto">,
    });
    setTsDraft(null);
    setTsError(null);
    setNotice(null);
  };

  const commitIso = () => {
    const text = isoDraft ?? isoCanonical;
    if (text.trim() === "") {
      clearAll();
      return;
    }
    const result = parseDateText(text, zoneId);
    if (result.ms === null) {
      setIsoError(result.error ?? "unrecognized");
      return;
    }
    setInstant({
      ms: result.ms,
      ns: result.ns ?? BigInt(result.ms) * 1_000_000n,
      unit: "ms",
    });
    setIsoDraft(null);
    setIsoError(null);
    setNotice(result.status === "exact" ? null : result.status);
  };

  const applyWall = (patch: Partial<WallParts>) => {
    const base: WallParts = wall ?? {
      ...wallParts(now, zoneId),
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    };
    const result = resolveWall({ ...base, ...patch }, zoneId);
    setInstant({
      ms: result.ms,
      ns: BigInt(result.ms) * 1_000_000n,
      unit: "ms",
    });
    setTsError(null);
    setIsoError(null);
    setNotice(result.status === "exact" ? null : result.status);
  };

  const pickDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    if (value === "" || !Number.isFinite(year) || !month || !day) return;
    applyWall({ year, month, day });
  };

  const pickTime = (value: string) => {
    const [hour, minute, second = "0"] = value.split(":");
    if (value === "" || hour === undefined || minute === undefined) return;
    applyWall({
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    });
  };

  const hasInput = instant !== null || tsDraft !== null || isoDraft !== null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {L.timezone}
        </span>
        <select
          aria-label={L.timezone}
          className={`${inputClass} w-56 max-w-full lg:w-80`}
          value={zoneId}
          onChange={(e) => {
            setZone(e.target.value);
            setNotice(null);
          }}
        >
          {options.map((id) => (
            <option key={id} value={id}>
              {optionLabels.get(id)}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatOffset(zoneOffset)} · {zoneName}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ToolButton onClick={useNow} title={L.nowHint}>
            {L.now}
          </ToolButton>
          {hasInput && <ToolButton onClick={clearAll}>{t.clear}</ToolButton>}
        </div>
      </div>

      <Card title={L.inputTitle}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={labelClass}>{L.timestamp}</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input
                className={`${inputClass} min-w-40 flex-1`}
                placeholder="1700000000"
                spellCheck={false}
                value={tsValue}
                onBlur={commitTimestamp}
                onChange={(e) => {
                  setTsDraft(e.target.value);
                  setTsError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTimestamp();
                }}
              />
              <Segmented
                ariaLabel={L.unitAria}
                value={unit}
                options={unitOptions}
                onChange={(next) => {
                  setUnit(next);
                  setTsError(null);
                }}
              />
              {detected && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {L.detected}: {detected}
                </span>
              )}
            </div>
          </div>
          {tsError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {tsError === "range" ? L.outOfRange : L.badTimestamp}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className={labelClass}>{L.dateText}</span>
            <input
              className={`${inputClass} min-w-40 flex-1`}
              placeholder={L.datePlaceholder}
              spellCheck={false}
              value={isoValue}
              onBlur={commitIso}
              onChange={(e) => {
                setIsoDraft(e.target.value);
                setIsoError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitIso();
              }}
            />
          </div>
          {isoError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {isoError === "range" ? L.outOfRange : L.unrecognized}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className={labelClass}>{L.wallTime}</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label={L.dateLabel}
                className={`${inputClass} w-36`}
                value={dateValue}
                onChange={(e) => pickDate(e.target.value)}
              />
              <input
                type="time"
                step={1}
                aria-label={L.timeLabel}
                className={`${inputClass} w-32`}
                value={timeValue}
                onChange={(e) => pickTime(e.target.value)}
              />
            </div>
          </div>

          {notice && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {notice === "gap"
                ? fill(L.gapWarning, { zone: zoneId, time: timeValue })
                : fill(L.ambiguousWarning, { zone: zoneId })}
            </p>
          )}
          {!instant && !tsError && !isoError && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {L.emptyHint}
            </p>
          )}
        </div>
      </Card>

      {fields && (
        <div className="grid shrink-0 grid-cols-1 items-start gap-3 lg:grid-cols-2">
          <Card title={L.dateFormats}>
            <div className="flex flex-col">
              <Field label={L.isoUtc} value={fields.isoUtc} />
              <Field label={L.isoZoned} value={fields.isoZoned} />
              <Field label={L.rfc2822} value={fields.rfc2822} />
              <Field label={L.httpDate} value={fields.httpDate} />
              <Field label={L.sql} value={fields.sql} />
              <Field label={L.localeString} value={fields.local} />
            </div>
          </Card>

          <Card title={L.timestamps}>
            <div className="flex flex-col">
              <Field label={L.unixSeconds} value={fields.unixSeconds} />
              <Field label={L.unixMillis} value={fields.unixMillis} />
              <Field label={L.unixMicros} value={fields.unixMicros} />
              <Field label={L.unixNanos} value={fields.unixNanos} />
              <Field label={L.dotnetTicks} value={fields.dotnetTicks} />
              <Field label={L.weekday} value={dayNames[fields.weekday]} />
              <Field label={L.timezone} value={fields.timezone} />
              <Field label={L.utcOffset} value={fields.offset} />
              <Field
                label={L.daylight}
                value={`${fields.dst ? L.dstOn : L.dstOff} (${
                  fields.abbreviation
                })`}
              />
              <Field
                label={L.relative}
                value={relativeText(fields.relative)}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
