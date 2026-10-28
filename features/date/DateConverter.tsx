"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Segmented, ToolButton, useStoredState } from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  formatDate,
  parseInput,
  type InputKind,
  type RelativeUnit,
  type RelativeParts,
  type TimeUnit,
} from "./format";
import { strings } from "./locale";

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
    <section className="flex flex-col overflow-hidden rounded border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
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
  "w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

export default function DateConverter() {
  const { t } = useLang();
  const L = useText(strings);
  const [unit, setUnit] = useStoredState<TimeUnit>("date.unit", "auto");
  const [input, setInput] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const unitOptions: { value: TimeUnit; label: string }[] = [
    { value: "auto", label: L.auto },
    { value: "s", label: L.seconds },
    { value: "ms", label: L.millis },
    { value: "us", label: L.micros },
    { value: "ns", label: L.nanos },
  ];

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const parsed = useMemo(() => parseInput(input, unit), [input, unit]);
  const fields = useMemo(
    () =>
      parsed.ms !== null && !parsed.error
        ? formatDate(parsed.ms, parsed.ns, now)
        : null,
    [parsed, now],
  );

  const kindLabel: Record<InputKind, string | null> = {
    timestamp: L.kindTimestamp,
    iso: L.kindIso,
    rfc2822: L.kindRfc2822,
    local: L.kindLocal,
    other: L.kindOther,
    empty: null,
  };

  const detectedUnit =
    parsed.unit && parsed.unit !== "auto"
      ? {
          s: L.seconds,
          ms: L.millis,
          us: L.micros,
          ns: L.nanos,
        }[parsed.unit]
      : null;

  const detected =
    !parsed.error && kindLabel[parsed.kind]
      ? detectedUnit
        ? `${kindLabel[parsed.kind]} · ${detectedUnit}`
        : kindLabel[parsed.kind]
      : null;

  const useNow = () => {
    const ms = Date.now();
    setInput(
      unit === "s"
        ? String(Math.floor(ms / 1000))
        : unit === "us"
          ? String(BigInt(ms) * 1000n)
          : unit === "ns"
            ? String(BigInt(ms) * 1000000n)
            : String(ms),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} min-w-40 flex-1`}
            placeholder={L.placeholder}
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <ToolButton onClick={useNow} title={L.nowHint}>
            {L.now}
          </ToolButton>
          {input !== "" && (
            <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(parsed.kind === "timestamp" || parsed.kind === "empty") && (
            <>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {L.unit}
              </span>
              <Segmented
                ariaLabel={L.unitAria}
                value={unit}
                options={unitOptions}
                onChange={setUnit}
              />
            </>
          )}
          {detected && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {L.detected}:{" "}
              <span className="text-neutral-700 dark:text-neutral-200">
                {detected}
              </span>
            </span>
          )}
        </div>
        {parsed.error && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {parsed.error === "range" ? L.outOfRange : L.unrecognized}
          </p>
        )}
        {!fields && !parsed.error && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {L.emptyHint}
          </p>
        )}
      </div>

      {fields && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card title={L.dateFormats}>
            <div className="flex flex-col">
              <Field label={L.isoUtc} value={fields.isoUtc} />
              <Field label={L.isoLocal} value={fields.isoLocal} />
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
              <Field
                label={L.timezone}
                value={`${fields.timezone} (${fields.offset})`}
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
