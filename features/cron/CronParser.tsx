"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import {
  describeCron,
  describeValues,
  nextRuns,
  parseCron,
  type CronFieldKey,
  type FieldDescription,
} from "./format";
import { strings } from "./locale";

const PRESETS = [
  "* * * * *",
  "*/5 * * * *",
  "0 9 * * 1-5",
  "0 0 1 * *",
  "30 4 1 1 *",
  "0 */2 * * * *",
];

/** Locale keys holding the day and month names, in index order. */
const DOW_KEYS = [
  "dowSun",
  "dowMon",
  "dowTue",
  "dowWed",
  "dowThu",
  "dowFri",
  "dowSat",
] as const;

const MONTH_KEYS = [
  "monthJan",
  "monthFeb",
  "monthMar",
  "monthApr",
  "monthMay",
  "monthJun",
  "monthJul",
  "monthAug",
  "monthSep",
  "monthOct",
  "monthNov",
  "monthDec",
] as const;

type Text = typeof strings.en;

const FIELD_LABEL: Record<CronFieldKey, keyof Text> = {
  second: "fieldSecond",
  minute: "fieldMinute",
  hour: "fieldHour",
  dayOfMonth: "fieldDayOfMonth",
  month: "fieldMonth",
  dayOfWeek: "fieldDayOfWeek",
};

const EVERY_LABEL: Record<CronFieldKey, keyof Text> = {
  second: "everySecond",
  minute: "everyMinute",
  hour: "everyHour",
  dayOfMonth: "everyDayOfMonth",
  month: "everyMonth",
  dayOfWeek: "everyDayOfWeek",
};

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export default function CronParser() {
  const L = useText(strings);
  const [expression, setExpression] = useStoredState(
    "cron.expr",
    "*/15 9-17 * * 1-5",
  );
  const [now, setNow] = useState(() => new Date());

  const result = useMemo(() => parseCron(expression), [expression]);
  const runs = useMemo(
    () => (result.spec ? nextRuns(result.spec, now, 10) : []),
    [result.spec, now],
  );
  const described = useMemo(
    () => (result.spec ? describeCron(result.spec) : []),
    [result.spec],
  );

  /** Turn a structured value set into text using the active language. */
  function describeField(key: CronFieldKey, d: FieldDescription): string {
    switch (d.kind) {
      case "all":
        return L[EVERY_LABEL[key]];
      case "days":
        return d.days.map((v) => L[DOW_KEYS[v]]).join(", ");
      case "months":
        return d.months.map((v) => L[MONTH_KEYS[v - 1]]).join(", ");
      case "many":
        return fill(L.manyValues, {
          count: d.count,
          range: `${d.min}-${d.max}`,
        });
      case "values":
        return d.values.join(", ");
    }
  }

  function formatRun(d: Date): string {
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const clock = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `${L[DOW_KEYS[d.getDay()]]} ${date} ${clock}`;
  }

  function relative(ms: number): string {
    const diff = Math.max(0, ms);
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d >= 365)
      return fill(L.relYears, {
        years: Math.floor(d / 365),
        months: Math.floor((d % 365) / 30),
      });
    if (d > 0) return fill(L.relDays, { days: d, hours: h % 24 });
    if (h > 0) return fill(L.relHours, { hours: h, minutes: m % 60 });
    if (m > 0) return fill(L.relMinutes, { minutes: m });
    return L.relSoon;
  }

  const runsText = runs.map(formatRun).join("\n");

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-64 flex-1 items-center rounded border border-neutral-300 bg-white px-2 dark:border-neutral-700 dark:bg-neutral-800">
          <input
            className="min-w-0 flex-1 bg-transparent py-1 font-mono text-xs outline-none placeholder:text-neutral-400"
            spellCheck={false}
            placeholder={L.exprHint}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
          />
        </div>
        <ToolButton onClick={() => setNow(new Date())} title={L.nowHint}>
          {L.now}
        </ToolButton>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-neutral-400">{L.presets}</span>
        {PRESETS.map((p) => (
          <ToolButton key={p} onClick={() => setExpression(p)}>
            <span className="font-mono">{p}</span>
          </ToolButton>
        ))}
      </div>

      {result.error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 font-mono text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </div>
      )}

      {result.spec && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
          <Panel title={L.fields}>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <tbody>
                  {result.spec.fields.map((f) => (
                    <tr
                      key={f.key}
                      className="border-b border-neutral-100 align-top dark:border-neutral-800"
                    >
                      <td className="w-28 py-1.5 pr-2 font-medium text-neutral-500 dark:text-neutral-400">
                        {L[FIELD_LABEL[f.key]]}
                      </td>
                      <td className="py-1.5 break-all font-mono text-neutral-700 dark:text-neutral-200">
                        {describeField(f.key, describeValues(f))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {described
                  .map((d) =>
                    fill(L.fieldLine, {
                      field: L[FIELD_LABEL[d.key]],
                      value: describeField(d.key, d.description),
                    }),
                  )
                  .join(" · ")}
              </p>
            </div>
          </Panel>

          <Panel
            title={L.nextRuns}
            actions={<CopyButton getText={() => runsText} />}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              {runs.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 border-b border-neutral-100 py-1.5 text-xs dark:border-neutral-800"
                >
                  <span className="w-6 shrink-0 text-right text-neutral-400">
                    {i + 1}
                  </span>
                  <span className="font-mono">{formatRun(d)}</span>
                  {i === 0 && (
                    <span className="ml-auto text-neutral-400">
                      {fill(L.inTime, {
                        time: relative(d.getTime() - now.getTime()),
                      })}
                    </span>
                  )}
                </div>
              ))}
              {runs.length === 0 && (
                <p className="py-2 text-xs text-neutral-400">{L.noFireTime}</p>
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
