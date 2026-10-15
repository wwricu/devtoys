"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { useLang, useText } from "@/lib/i18n";
import { PRESETS, build, fromOctal, type ChmodResult } from "./format";
import { strings } from "./locale";

type Who = "owner" | "group" | "other";
type Special = "setuid" | "setgid" | "sticky";

const WHO_KEYS: Who[] = ["owner", "group", "other"];
const BIT_KEYS = [
  { key: "read", bit: 4 },
  { key: "write", bit: 2 },
  { key: "execute", bit: 1 },
] as const;
const SPECIAL_KEYS: Special[] = ["setuid", "setgid", "sticky"];

export default function ChmodCalculator() {
  const { t } = useLang();
  const L = useText(strings);
  const [seed, setSeed] = useStoredState<string>("chmod.input", "755");
  const [text, setText] = useState(seed);
  const [values, setValues] = useState<ChmodResult>(
    () => fromOctal(seed) ?? build(7, 5, 5, false, false, false),
  );

  const parsed = useMemo(() => fromOctal(text), [text]);

  const commit = (next: ChmodResult) => {
    setValues(next);
    setText(next.octal);
    setSeed(next.octal);
  };

  const shown = parsed ?? values;
  const error =
    text.trim() !== "" && parsed === null
      ? "Enter three or four octal digits (0-7)"
      : null;

  const toggleBit = (row: Who, bit: number) => {
    const current = shown[row];
    commit(
      build(
        row === "owner" ? current ^ bit : shown.owner,
        row === "group" ? current ^ bit : shown.group,
        row === "other" ? current ^ bit : shown.other,
        shown.setuid,
        shown.setgid,
        shown.sticky,
      ),
    );
  };

  const toggleSpecial = (key: Special) => {
    commit(
      build(
        shown.owner,
        shown.group,
        shown.other,
        key === "setuid" ? !shown.setuid : shown.setuid,
        key === "setgid" ? !shown.setgid : shown.setgid,
        key === "sticky" ? !shown.sticky : shown.sticky,
      ),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-40 rounded border border-neutral-300 bg-white px-2 py-1.5 font-mono text-sm outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder={L.inputHint}
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
            title={L[p.id]}
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
        <Panel title={L.permissions}>
          <div className="overflow-y-auto p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1 font-normal">{L.who}</th>
                  {BIT_KEYS.map((c) => (
                    <th key={c.key} className="py-1 text-center font-normal">
                      {L[c.key]}
                    </th>
                  ))}
                  <th className="py-1 text-right font-normal">{L.value}</th>
                </tr>
              </thead>
              <tbody>
                {WHO_KEYS.map((row) => (
                  <tr
                    key={row}
                    className="border-t border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="py-1.5 text-neutral-700 dark:text-neutral-200">
                      {L[row]}
                    </td>
                    {BIT_KEYS.map((c) => (
                      <td key={c.key} className="py-1.5 text-center">
                        <input
                          type="checkbox"
                          className="accent-emerald-600"
                          checked={(shown[row] & c.bit) !== 0}
                          onChange={() => toggleBit(row, c.bit)}
                          aria-label={`${L[row]} ${L[c.key]}`}
                        />
                      </td>
                    ))}
                    <td className="py-1.5 text-right font-mono text-neutral-700 dark:text-neutral-200">
                      {shown[row]}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-1.5 text-neutral-700 dark:text-neutral-200">
                    {L.special}
                  </td>
                  {SPECIAL_KEYS.map((s) => (
                    <td key={s} className="py-1.5 text-center">
                      <label className="flex flex-col items-center gap-0.5">
                        <input
                          type="checkbox"
                          className="accent-emerald-600"
                          checked={shown[s]}
                          onChange={() => toggleSpecial(s)}
                          aria-label={L[s]}
                        />
                        <span className="text-[10px] text-neutral-500">
                          {L[s]}
                        </span>
                      </label>
                    </td>
                  ))}
                  <td className="py-1.5 text-right font-mono text-neutral-500">
                    {(shown.setuid ? 4 : 0) +
                      (shown.setgid ? 2 : 0) +
                      (shown.sticky ? 1 : 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title={t.result}
          actions={
            <CopyButton getText={() => `${shown.octal} ${shown.symbolic}`} />
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            <p className="font-mono text-2xl text-neutral-800 dark:text-neutral-100">
              -{shown.symbolic}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-neutral-500">{L.octal}</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-100">
                {shown.octal}
              </dd>
              <dt className="text-neutral-500">{L.symbolic}</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-100">
                {shown.symbolic}
              </dd>
              <dt className="text-neutral-500">{L.command}</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-100">
                chmod {shown.octal} file
              </dd>
              <dt className="text-neutral-500">{L.breakdown}</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-100">
                {shown.summary}
              </dd>
              {shown.flags.length > 0 && (
                <>
                  <dt className="text-neutral-500">{L.flags}</dt>
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
