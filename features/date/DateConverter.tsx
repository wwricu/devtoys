"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Segmented, ToolButton, useStoredState } from "@/components/kit";
import {
  formatDate,
  parseDateString,
  timestampToMs,
  type TimeUnit,
} from "./format";

const unitOptions: { value: TimeUnit; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "s", label: "Seconds" },
  { value: "ms", label: "Millis" },
  { value: "us", label: "Micros" },
  { value: "ns", label: "Nanos" },
];

function Field({ label, value }: { label: string; value: string }) {
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
        title="Click to copy"
        className="min-w-0 flex-1 truncate rounded px-1 text-right font-mono text-xs text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        {copied ? "Copied" : value || "—"}
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
  const [unit, setUnit] = useStoredState<TimeUnit>("date.unit", "auto");
  const [tsInput, setTsInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [now, setNow] = useState(() => Date.now());

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
        <span>Current:</span>
        <span className="font-mono text-neutral-700 dark:text-neutral-200">
          {new Date(now).toISOString()}
        </span>
        <span className="font-mono">· {Math.floor(now / 1000)}s</span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Timestamp → Date">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={inputClass}
              placeholder="e.g. 1700000000"
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
            />
            <ToolButton onClick={useNowTs} title="Use current time">
              Now
            </ToolButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">Unit</span>
            <Segmented
              ariaLabel="Timestamp unit"
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
              <Field label="Local" value={tsFields.local} />
              <Field label="Weekday" value={tsFields.weekday} />
              <Field label="Relative" value={tsFields.relative} />
              <Field
                label="Detected unit"
                value={String(tsResult.detectedUnit)}
              />
              <Field label="Timezone" value={`${tsFields.timezone} (${tsFields.offset})`} />
            </div>
          )}
        </Card>

        <Card title="Date → Timestamp">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={inputClass}
              placeholder="e.g. 2026-10-15 08:30:00 or ISO"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
            <ToolButton onClick={useNowDate} title="Use current time">
              Now
            </ToolButton>
          </div>
          {dateInvalid && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Unrecognized date format
            </p>
          )}
          {dateFields && (
            <div className="flex flex-col">
              <Field label="ISO 8601 (UTC)" value={dateFields.isoUtc} />
              <Field label="Unix (seconds)" value={dateFields.unixSeconds} />
              <Field label="Unix (millis)" value={dateFields.unixMillis} />
              <Field label="Unix (micros)" value={dateFields.unixMicros} />
              <Field label="Unix (nanos)" value={dateFields.unixNanos} />
              <Field label="Local" value={dateFields.local} />
              <Field label="Relative" value={dateFields.relative} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
