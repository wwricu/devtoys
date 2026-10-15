"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Segmented, ToolButton, useStoredState } from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  formatDate,
  parseDateString,
  timestampToMs,
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
        title={t.copyHint}
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
  const L = useText(strings);
  const [unit, setUnit] = useStoredState<TimeUnit>("date.unit", "auto");
  const [tsInput, setTsInput] = useState("");
  const [dateInput, setDateInput] = useState("");
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

  const tsResult = useMemo(() => timestampToMs(tsInput, unit), [tsInput, unit]);
  const tsFields =
    tsResult.ms !== null && !tsResult.error ? formatDate(tsResult.ms) : null;

  const parsedMs = useMemo(() => parseDateString(dateInput), [dateInput]);
  const dateFields =
    dateInput.trim() !== "" && parsedMs !== null ? formatDate(parsedMs) : null;
  const dateInvalid = dateInput.trim() !== "" && parsedMs === null;

  const useNowTs = () => setTsInput(String(Date.now()));
  const useNowDate = () => setDateInput(new Date().toISOString());

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <span>{L.current}</span>
        <span className="font-mono text-neutral-700 dark:text-neutral-200">
          {new Date(now).toISOString()}
        </span>
        <span className="font-mono">· {Math.floor(now / 1000)}s</span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title={L.tsToCard}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={inputClass}
              placeholder={L.tsHint}
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
            />
            <ToolButton onClick={useNowTs} title={L.nowHint}>
              {L.now}
            </ToolButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">{L.unit}</span>
            <Segmented
              ariaLabel={L.unitAria}
              value={unit}
              options={unitOptions}
              onChange={setUnit}
            />
          </div>
          {tsResult.error && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {tsResult.error}
            </p>
          )}
          {tsFields && (
            <div className="flex flex-col">
              <Field label="ISO 8601 (UTC)" value={tsFields.isoUtc} />
              <Field label="UTC" value={tsFields.utc} />
              <Field label={L.local} value={tsFields.local} />
              <Field label={L.weekday} value={dayNames[tsFields.weekday]} />
              <Field
                label={L.relative}
                value={relativeText(tsFields.relative)}
              />
              <Field
                label={L.detectedUnit}
                value={String(tsResult.detectedUnit)}
              />
              <Field
                label={L.timezone}
                value={`${tsFields.timezone} (${tsFields.offset})`}
              />
            </div>
          )}
        </Card>

        <Card title={L.dateToCard}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={inputClass}
              placeholder={L.dateHint}
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
            <ToolButton onClick={useNowDate} title={L.nowHint}>
              {L.now}
            </ToolButton>
          </div>
          {dateInvalid && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {L.unrecognizedDate}
            </p>
          )}
          {dateFields && (
            <div className="flex flex-col">
              <Field label="ISO 8601 (UTC)" value={dateFields.isoUtc} />
              <Field label={L.unixSeconds} value={dateFields.unixSeconds} />
              <Field label={L.unixMillis} value={dateFields.unixMillis} />
              <Field label={L.unixMicros} value={dateFields.unixMicros} />
              <Field label={L.unixNanos} value={dateFields.unixNanos} />
              <Field label={L.local} value={dateFields.local} />
              <Field
                label={L.relative}
                value={relativeText(dateFields.relative)}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
