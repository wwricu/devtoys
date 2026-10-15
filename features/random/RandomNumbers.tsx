"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel, Segmented, StatusLine, ToolButton, editorClass, useStoredState } from "@/components/kit";
import { randomFloats, randomInts } from "./format";

type Kind = "integers" | "decimals";

const kindOptions: { value: Kind; label: string }[] = [
  { value: "integers", label: "Integers" },
  { value: "decimals", label: "Decimals" },
];

const PRESETS: { label: string; kind: Kind; min: number; max: number; count: number }[] = [
  { label: "Coin flip", kind: "integers", min: 1, max: 2, count: 1 },
  { label: "Six-sided die", kind: "integers", min: 1, max: 6, count: 1 },
  { label: "Two dice", kind: "integers", min: 1, max: 6, count: 2 },
  { label: "D20 roll", kind: "integers", min: 1, max: 20, count: 1 },
  { label: "Lotto 6 of 49", kind: "integers", min: 1, max: 49, count: 6 },
  { label: "Random percentage", kind: "decimals", min: 0, max: 100, count: 1 },
];

export default function RandomNumbers() {
  const [kind, setKind] = useStoredState<Kind>("random.kind", "integers");
  const [min, setMin] = useStoredState<number>("random.min", 1);
  const [max, setMax] = useStoredState<number>("random.max", 100);
  const [count, setCount] = useStoredState<number>("random.count", 5);
  const [decimals, setDecimals] = useStoredState<number>("random.decimals", 2);
  const [unique, setUnique] = useStoredState<boolean>("random.unique", false);
  const [sort, setSort] = useStoredState<boolean>("random.sort", false);
  const [draw, setDraw] = useState(0);

  const { output, error } = useMemo(() => {
    try {
      const values =
        kind === "integers"
          ? randomInts({ min, max, count, unique, sort }).map(String)
          : randomFloats({ min, max, count, decimals });
      return { output: values.join("\n"), error: null as string | null };
    } catch (err) {
      return { output: "", error: err instanceof Error ? err.message : String(err) };
    }
    // draw is a nonce: bumping it re-rolls without changing any option
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, min, max, count, decimals, unique, sort, draw]);

  const numberField = (label: string, value: number, set: (n: number) => void) => (
    <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
      {label}
      <input
        type="number"
        className="w-24 rounded border border-neutral-300 bg-white px-1.5 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
        value={value}
        onChange={(e) => set(Number(e.target.value) || 0)}
      />
    </label>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={kind} options={kindOptions} onChange={setKind} ariaLabel="Number type" />
        {numberField("From", min, setMin)}
        {numberField("To", max, setMax)}
        {numberField("How many", count, setCount)}
        {kind === "decimals" && numberField("Decimals", decimals, setDecimals)}
        {kind === "integers" && (
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={unique}
              onChange={(e) => setUnique(e.target.checked)}
            />
            No repeats
          </label>
        )}
        {kind === "integers" && (
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={sort}
              onChange={(e) => setSort(e.target.checked)}
            />
            Sort
          </label>
        )}
        <ToolButton onClick={() => setDraw((d) => d + 1)}>Draw again</ToolButton>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
        <Panel title="Presets">
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-3">
            {PRESETS.map((preset) => (
              <ToolButton
                key={preset.label}
                onClick={() => {
                  setKind(preset.kind);
                  setMin(preset.min);
                  setMax(preset.max);
                  setCount(preset.count);
                  if (preset.label === "Lotto 6 of 49") {
                    setUnique(true);
                    setSort(true);
                  }
                  setDraw((d) => d + 1);
                }}
              >
                {preset.label}
              </ToolButton>
            ))}
            <p className="mt-1 text-xs text-neutral-400">
              Values come from <span className="font-mono">crypto.getRandomValues</span>, drawn in
              your browser.
            </p>
          </div>
        </Panel>
        <Panel
          title="Numbers"
          actions={
            <>
              <CopyButton getText={() => output} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder="Numbers"
            value={output}
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={output ? `${output.split("\n").length} values from ${min} to ${max}` : "Ready"}
      />
    </div>
  );
}
