"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  editorClass,
  Panel,
  Segmented,
  Split,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { randomFloats, randomInts } from "./format";
import { strings } from "./locale";

type Kind = "integers" | "decimals";

type PresetId = "coin" | "die" | "dice" | "d20" | "lotto" | "percent";

export default function RandomNumbers() {
  const { t } = useLang();
  const L = useText(strings);
  const [kind, setKind] = useStoredState<Kind>("random.kind", "integers");
  const [min, setMin] = useStoredState<number>("random.min", 1);
  const [max, setMax] = useStoredState<number>("random.max", 100);
  const [count, setCount] = useStoredState<number>("random.count", 5);
  const [decimals, setDecimals] = useStoredState<number>("random.decimals", 2);
  const [unique, setUnique] = useStoredState<boolean>("random.unique", false);
  const [sort, setSort] = useStoredState<boolean>("random.sort", false);
  const [draw, setDraw] = useState(0);

  const kindOptions: { value: Kind; label: string }[] = [
    { value: "integers", label: L.integers },
    { value: "decimals", label: L.decimals },
  ];

  const presets: {
    id: PresetId;
    label: string;
    kind: Kind;
    min: number;
    max: number;
    count: number;
  }[] = [
    {
      id: "coin",
      label: L.coinFlip,
      kind: "integers",
      min: 1,
      max: 2,
      count: 1,
    },
    { id: "die", label: L.die, kind: "integers", min: 1, max: 6, count: 1 },
    {
      id: "dice",
      label: L.twoDice,
      kind: "integers",
      min: 1,
      max: 6,
      count: 2,
    },
    { id: "d20", label: L.d20, kind: "integers", min: 1, max: 20, count: 1 },
    {
      id: "lotto",
      label: L.lotto,
      kind: "integers",
      min: 1,
      max: 49,
      count: 6,
    },
    {
      id: "percent",
      label: L.percentage,
      kind: "decimals",
      min: 0,
      max: 100,
      count: 1,
    },
  ];

  const { output, error } = useMemo(() => {
    try {
      const values =
        kind === "integers"
          ? randomInts({ min, max, count, unique, sort }).map(String)
          : randomFloats({ min, max, count, decimals });
      return { output: values.join("\n"), error: null as string | null };
    } catch (err) {
      return {
        output: "",
        // Validation messages from the engine stay in English.
        error: err instanceof Error ? err.message : String(err),
      };
    }
    // draw is a nonce: bumping it re-rolls without changing any option
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, min, max, count, decimals, unique, sort, draw]);

  const numberField = (
    label: string,
    value: number,
    set: (n: number) => void,
  ) => (
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
        <Segmented
          value={kind}
          options={kindOptions}
          onChange={setKind}
          ariaLabel={L.numberType}
        />
        {numberField(L.from, min, setMin)}
        {numberField(L.to, max, setMax)}
        {numberField(L.howMany, count, setCount)}
        {kind === "decimals" &&
          numberField(L.decimalPlaces, decimals, setDecimals)}
        {kind === "integers" && (
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={unique}
              onChange={(e) => setUnique(e.target.checked)}
            />
            {L.noRepeats}
          </label>
        )}
        {kind === "integers" && (
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={sort}
              onChange={(e) => setSort(e.target.checked)}
            />
            {L.sort}
          </label>
        )}
        <ToolButton onClick={() => setDraw((d) => d + 1)}>
          {L.drawAgain}
        </ToolButton>
      </div>

      <Split>
        <Panel title={L.presets}>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-3">
            {presets.map((preset) => (
              <ToolButton
                key={preset.id}
                onClick={() => {
                  setKind(preset.kind);
                  setMin(preset.min);
                  setMax(preset.max);
                  setCount(preset.count);
                  if (preset.id === "lotto") {
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
              {L.noteBefore}{" "}
              <span className="font-mono">crypto.getRandomValues</span>
              {L.noteAfter}
            </p>
          </div>
        </Panel>
        <Panel
          title={L.numbers}
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
            placeholder={L.numbers}
            value={output}
          />
        </Panel>
      </Split>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? fill(L.stats, { count: output.split("\n").length, min, max })
            : t.ready
        }
      />
    </div>
  );
}
