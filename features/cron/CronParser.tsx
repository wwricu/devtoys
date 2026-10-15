"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel, ToolButton, useStoredState } from "@/components/kit";
import {
  DOW_LABELS,
  describeCron,
  formatFieldValues,
  nextRuns,
  parseCron,
} from "./format";

const PRESETS = [
  "* * * * *",
  "*/5 * * * *",
  "0 9 * * 1-5",
  "0 0 1 * *",
  "30 4 1 1 *",
  "0 */2 * * * *",
];

function relative(ms: number): string {
  const diff = Math.max(0, ms);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 365) return `${Math.floor(d / 365)}y ${Math.floor((d % 365) / 30)}mo`;
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return "soon";
}

export default function CronParser() {
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

  const runsText = runs
    .map(
      (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate(),
        ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes(),
        ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
    )
    .join("\n");

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-64 flex-1 items-center rounded border border-neutral-300 bg-white px-2 dark:border-neutral-700 dark:bg-neutral-800">
          <input
            className="min-w-0 flex-1 bg-transparent py-1 font-mono text-xs outline-none placeholder:text-neutral-400"
            spellCheck={false}
            placeholder="Cron expression, 5 or 6 fields"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
          />
        </div>
        <ToolButton onClick={() => setNow(new Date())} title="Recompute from the current time">
          Now
        </ToolButton>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-neutral-400">Presets:</span>
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
          <Panel title="Fields">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <tbody>
                  {result.spec.fields.map((f) => (
                    <tr
                      key={f.name}
                      className="border-b border-neutral-100 align-top dark:border-neutral-800"
                    >
                      <td className="w-28 py-1.5 pr-2 font-medium text-neutral-500 dark:text-neutral-400">
                        {f.name}
                      </td>
                      <td className="py-1.5 break-all font-mono text-neutral-700 dark:text-neutral-200">
                        {formatFieldValues(f)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {described.join(" · ")}
              </p>
            </div>
          </Panel>

          <Panel
            title="Next runs"
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
                  <span className="font-mono">
                    {DOW_LABELS[d.getDay()]}{" "}
                    {d.getFullYear()}-{String(d.getMonth() + 1).padStart(2, "0")}-
                    {String(d.getDate()).padStart(2, "0")}{" "}
                    {String(d.getHours()).padStart(2, "0")}:
                    {String(d.getMinutes()).padStart(2, "0")}:
                    {String(d.getSeconds()).padStart(2, "0")}
                  </span>
                  {i === 0 && (
                    <span className="ml-auto text-neutral-400">
                      in {relative(d.getTime() - now.getTime())}
                    </span>
                  )}
                </div>
              ))}
              {runs.length === 0 && (
                <p className="py-2 text-xs text-neutral-400">
                  No fire time found within the next 4 years.
                </p>
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
