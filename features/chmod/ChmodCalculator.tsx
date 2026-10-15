"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel, StatusLine, ToolButton, useStoredState } from "@/components/kit";
import { PRESETS, build, fromOctal, type ChmodResult } from "./format";

const ROWS: { key: "owner" | "group" | "other"; label: string }[] = [
  { key: "owner", label: "Owner (u)" },
  { key: "group", label: "Group (g)" },
  { key: "other", label: "Public (o)" },
];

const COLS: { label: string; bit: number }[] = [
  { label: "Read", bit: 4 },
  { label: "Write", bit: 2 },
  { label: "Execute", bit: 1 },
];

const SPECIALS: { key: "setuid" | "setgid" | "sticky"; label: string }[] = [
  { key: "setuid", label: "Setuid" },
  { key: "setgid", label: "Setgid" },
  { key: "sticky", label: "Sticky" },
];

export default function ChmodCalculator() {
  const [seed, setSeed] = useStoredState<string>("chmod.input", "755");
  const [text, setText] = useState(seed);
  const [values, setValues] = useState<ChmodResult>(() => fromOctal(seed) ?? build(7, 5, 5, false, false, false));

  const parsed = useMemo(() => fromOctal(text), [text]);

  const commit = (next: ChmodResult) => {
    setValues(next);
    setText(next.octal);
    setSeed(next.octal);
  };

  const shown = parsed ?? values;
  const error = text.trim() !== "" && parsed === null ? "Enter three or four octal digits (0-7)" : null;

  const toggleBit = (row: "owner" | "group" | "other", bit: number) => {
    const current = shown[row];
    commit(build(
      row === "owner" ? current ^ bit : shown.owner,
      row === "group" ? current ^ bit : shown.group,
      row === "other" ? current ^ bit : shown.other,
      shown.setuid,
      shown.setgid,
      shown.sticky,
    ));
  };

  const toggleSpecial = (key: "setuid" | "setgid" | "sticky") => {
    commit(build(
      shown.owner,
      shown.group,
      shown.other,
      key === "setuid" ? !shown.setuid : shown.setuid,
      key === "setgid" ? !shown.setgid : shown.setgid,
      key === "sticky" ? !shown.sticky : shown.sticky,
    ));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-40 rounded border border-neutral-300 bg-white px-2 py-1.5 font-mono text-sm outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder="0755"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSeed(e.target.value);
            const ok = fromOctal(e.target.value);
            if (ok) setValues(ok);
          }}
        />
        {PRESETS.map((p) => (
          <ToolButton
            key={p.octal}
            title={p.label}
            onClick={() => {
              const ok = fromOctal(p.octal);
              if (ok) commit(ok);
            }}
          >
            {p.octal}
          </ToolButton>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
        <Panel title="Permissions">
          <div className="overflow-y-auto p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1 font-normal">Who</th>
                  {COLS.map((c) => (
                    <th key={c.label} className="py-1 text-center font-normal">{c.label}</th>
                  ))}
                  <th className="py-1 text-right font-normal">Value</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.key} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="py-1.5 text-neutral-700 dark:text-neutral-200">{row.label}</td>
                    {COLS.map((c) => (
                      <td key={c.label} className="py-1.5 text-center">
                        <input
                          type="checkbox"
                          className="accent-emerald-600"
                          checked={(shown[row.key] & c.bit) !== 0}
                          onChange={() => toggleBit(row.key, c.bit)}
                          aria-label={`${row.label} ${c.label}`}
                        />
                      </td>
                    ))}
                    <td className="py-1.5 text-right font-mono text-neutral-700 dark:text-neutral-200">
                      {shown[row.key]}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-1.5 text-neutral-700 dark:text-neutral-200">Special</td>
                  {SPECIALS.map((s) => (
                    <td key={s.key} className="py-1.5 text-center">
                      <label className="flex flex-col items-center gap-0.5">
                        <input
                          type="checkbox"
                          className="accent-emerald-600"
                          checked={shown[s.key]}
                          onChange={() => toggleSpecial(s.key)}
                          aria-label={s.label}
                        />
                        <span className="text-[10px] text-neutral-500">{s.label}</span>
                      </label>
                    </td>
                  ))}
                  <td className="py-1.5 text-right font-mono text-neutral-500">
                    {(shown.setuid ? 4 : 0) + (shown.setgid ? 2 : 0) + (shown.sticky ? 1 : 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Result"
          actions={<CopyButton getText={() => `${shown.octal} ${shown.symbolic}`} />}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            <p className="font-mono text-2xl text-neutral-800 dark:text-neutral-100">
              -{shown.symbolic}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-neutral-500">Octal</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-100">{shown.octal}</dd>
              <dt className="text-neutral-500">Symbolic</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-100">{shown.symbolic}</dd>
              <dt className="text-neutral-500">chmod</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-100">
                chmod {shown.octal} file
              </dd>
              <dt className="text-neutral-500">Breakdown</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-100">{shown.summary}</dd>
              {shown.flags.length > 0 && (
                <>
                  <dt className="text-neutral-500">Flags</dt>
                  <dd className="font-mono text-amber-600 dark:text-amber-400">
                    {shown.flags.join(", ")}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={error ? "" : `chmod ${shown.octal} · ${shown.symbolic}`}
      />
    </div>
  );
}
