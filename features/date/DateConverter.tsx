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
  isValidZone,
  resolveWall,
  supportedZones,
  systemZone,
  wallParts,
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

type StepUnit = "day" | "month" | "year" | "second" | "minute" | "hour";

/**
 * Calendar shift for the wall clock: Jan 31 plus a month is Feb 28 rather than
 * Mar 3, and the time fields wrap inside the day the way the native ones did.
 */
function shiftWall(parts: WallParts, unit: StepUnit, dir: 1 | -1): WallParts {
  if (unit === "second" || unit === "minute" || unit === "hour") {
    const each = unit === "hour" ? 3600 : unit === "minute" ? 60 : 1;
    const total =
      (parts.hour * 3600 + parts.minute * 60 + parts.second + dir * each + 86_400) %
      86_400;
    return {
      ...parts,
      hour: Math.floor(total / 3600),
      minute: Math.floor(total / 60) % 60,
      second: total % 60,
    };
  }
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  if (unit === "day") {
    date.setUTCDate(parts.day + dir);
  } else {
    const lastDay = new Date(0);
    date.setUTCDate(1);
    date.setUTCMonth(parts.month - 1 + (unit === "month" ? dir : dir * 12));
    lastDay.setUTCFullYear(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(parts.day, lastDay.getUTCDate()));
  }
  return {
    ...parts,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

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

const iconClass =
  "shrink-0 rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300";

const calendarPath =
  "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z";
const clockPath = "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z";

// The invisible native field is only what showPicker() opens; the visible box
// keeps the year-month-day order the native one would not render.
function PickerButton({
  label,
  path,
  type,
  value,
  onPick,
}: {
  label: string;
  path: string;
  type: "date" | "time";
  value: string;
  onPick: (value: string) => void;
}) {
  const field = useRef<HTMLInputElement>(null);
  return (
    <span className="relative inline-flex shrink-0 items-center">
      <input
        ref={field}
        type={type}
        step={type === "time" ? 1 : undefined}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
        value={value}
        onChange={(e) => onPick(e.target.value)}
      />
      <button
        type="button"
        title={label}
        aria-label={label}
        className={iconClass}
        onClick={() => field.current?.showPicker()}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={path} />
        </svg>
      </button>
    </span>
  );
}

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
  const [wallDraft, setWallDraft] = useState<{
    date?: string;
    time?: string;
  }>({});
  const [tsError, setTsError] = useState<ParseError>(null);
  const [isoError, setIsoError] = useState<ParseError>(null);
  const [wallError, setWallError] = useState<ParseError>(null);
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
  // Computing every label is a full Intl sweep, so it runs after paint in
  // frame-sized slices instead of inside the entry render. Until the map
  // lands, the selected zone keeps its offset and the others show plain ids.
  // zone.ts caches each label, so revisits within the same minute are just a
  // map fill.
  const [labelState, setLabelState] = useState<{
    anchor: number;
    labels: Map<string, string>;
  } | null>(null);

  useEffect(() => {
    let frame = 0;
    const labels = new Map<string, string>();
    let index = 0;
    const step = () => {
      const end = performance.now() + 6;
      while (index < options.length && performance.now() < end) {
        const id = options[index];
        labels.set(id, zoneOptionLabel(labelAnchor, id));
        index += 1;
      }
      if (index < options.length) {
        frame = requestAnimationFrame(step);
      } else {
        setLabelState({ anchor: labelAnchor, labels });
      }
    };
    step();
    return () => cancelAnimationFrame(frame);
  }, [options, labelAnchor]);
  const labels = labelState?.anchor === labelAnchor ? labelState.labels : null;

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
  const dateShown = wallDraft.date ?? dateValue;
  const timeShown = wallDraft.time ?? timeValue;

  const clearAll = () => {
    setInstant(null);
    setTsDraft(null);
    setIsoDraft(null);
    setWallDraft({});
    setTsError(null);
    setIsoError(null);
    setWallError(null);
    setNotice(null);
  };

  const useNow = () => {
    const ms = Date.now();
    setInstant({ ms, ns: BigInt(ms) * 1_000_000n, unit: "ms" });
    setTsDraft(null);
    setIsoDraft(null);
    setWallDraft({});
    setTsError(null);
    setIsoError(null);
    setWallError(null);
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

  const editWall = (which: "date" | "time", value: string) => {
    setWallDraft((d) => ({ ...d, [which]: value }));
    setWallError(null);
  };

  /**
   * The two boxes describe one wall clock, so a commit resolves the pair
   * through the same parser as the ISO field and keeps the sub-second part the
   * instant already had, which the boxes do not show.
   */
  const wallText = (date: string, time: string) => {
    const milli = wall?.millisecond ?? 0;
    // `9:5` means 09:05; the parser wants each field widened.
    const [h = "0", minute = "0", second = "0"] = time.split(":");
    return `${date} ${pad(Number(h))}:${pad(Number(minute))}:${pad(Number(second))}${
      milli && !time.includes(".") ? `.${pad(milli, 3)}` : ""
    }`;
  };

  /** Both ways in: one instant, and every other field's draft and error cleared. */
  const applyInstant = (
    ms: number,
    ns: bigint | null,
    status: WallStatus | null,
  ) => {
    setInstant({ ms, ns: ns ?? BigInt(ms) * 1_000_000n, unit: "ms" });
    setWallDraft({});
    setWallError(null);
    setTsError(null);
    setIsoError(null);
    setNotice(status === "exact" ? null : status);
  };

  const commitWall = (which: "date" | "time", picked?: string) => {
    const text = (picked ?? (which === "date" ? dateShown : timeShown)).trim();
    if (text === "") {
      setWallDraft((d) => ({ ...d, [which]: undefined }));
      return;
    }
    const result = parseDateText(
      wallText(
        which === "date" ? text : dateValue,
        which === "time" ? text : timeValue,
      ),
      zoneId,
    );
    if (result.ms === null) {
      setWallError(result.error ?? "unrecognized");
      return;
    }
    applyInstant(result.ms, result.ns, result.status);
  };

  /**
   * Arrow keys step one field of the shown clock, so a half-typed draft is not
   * lost. The shifted parts go back through resolveWall, which is what makes a
   * step into a DST gap or an ambiguous hour land where typing it would.
   */
  const stepWall = (which: "date" | "time", unit: StepUnit, dir: 1 | -1) => {
    const result = parseDateText(
      wallText(dateShown.trim() || dateValue, timeShown.trim() || timeValue),
      zoneId,
    );
    if (result.ms === null) {
      setWallError(result.error ?? "unrecognized");
      return;
    }
    const parts = wallParts(result.ms, zoneId);
    const moved = resolveWall(shiftWall(parts, unit, dir), zoneId);
    applyInstant(moved.ms, null, moved.status);
  };

  const stepKeys = (
    which: "date" | "time",
    units: [StepUnit, StepUnit, StepUnit],
  ) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitWall(which);
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    stepWall(
      which,
      event.altKey ? units[2] : event.shiftKey ? units[1] : units[0],
      event.key === "ArrowUp" ? 1 : -1,
    );
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
          // Full-width own row on narrow screens keeps the leading IANA id readable.
          className={`${inputClass} order-last w-full sm:order-none sm:w-72 lg:w-96`}
          value={zoneId}
          onChange={(e) => {
            setZone(e.target.value);
            setNotice(null);
          }}
        >
          {options.map((id) => (
            <option key={id} value={id}>
              {labels?.get(id) ??
                (id === zoneId ? zoneOptionLabel(labelAnchor, id) : id)}
            </option>
          ))}
        </select>
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
              {/* Icon hugs its own box, so the pair also wraps together. */}
              <div className="flex min-w-32 flex-[1.3] items-center gap-1">
                <input
                  aria-label={L.dateLabel}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder={L.ymdPlaceholder}
                  spellCheck={false}
                  title={L.dateStepHint}
                  value={dateShown}
                  onChange={(e) => editWall("date", e.target.value)}
                  onBlur={() => commitWall("date")}
                  onKeyDown={stepKeys("date", ["day", "month", "year"])}
                />
                <PickerButton
                  label={L.pickDate}
                  path={calendarPath}
                  type="date"
                  value={dateValue}
                  onPick={(v) => commitWall("date", v)}
                />
              </div>
              <div className="flex min-w-28 flex-1 items-center gap-1">
                <input
                  aria-label={L.timeLabel}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder={L.hmsPlaceholder}
                  spellCheck={false}
                  title={L.timeStepHint}
                  value={timeShown}
                  onChange={(e) => editWall("time", e.target.value)}
                  onBlur={() => commitWall("time")}
                  onKeyDown={stepKeys("time", ["second", "minute", "hour"])}
                />
                <PickerButton
                  label={L.pickTime}
                  path={clockPath}
                  type="time"
                  value={timeValue}
                  onPick={(v) => commitWall("time", v)}
                />
              </div>
            </div>
          </div>
          {wallError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {wallError === "range" ? L.outOfRange : L.unrecognized}
            </p>
          )}

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
