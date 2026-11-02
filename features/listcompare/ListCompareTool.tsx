"use client";

import { useMemo, useState } from "react";
import CodeField from "@/components/CodeField";
import {
  CopyButton,
  Panel,
  Segmented,
  Split,
  useStoredState,
} from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import { compareLists, type CompareMode } from "./format";
import { strings } from "./locale";

function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export default function ListCompareTool() {
  const L = useText(strings);
  const [listA, setListA] = useState("");
  const [listB, setListB] = useState("");
  const [mode, setMode] = useStoredState<CompareMode>(
    "listcompare.mode",
    "intersection",
  );
  const [caseSensitive, setCaseSensitive] = useStoredState(
    "listcompare.caseSensitive",
    false,
  );

  const modeOptions: { value: CompareMode; label: string }[] = [
    { value: "intersection", label: L.intersection },
    { value: "union", label: L.union },
    { value: "aOnly", label: L.aOnly },
    { value: "bOnly", label: L.bOnly },
  ];

  const result = useMemo(
    () => compareLists(listA, listB, mode, caseSensitive),
    [listA, listB, mode, caseSensitive],
  );
  const output = result.join("\n");

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel={L.modeAria}
          value={mode}
          options={modeOptions}
          onChange={setMode}
        />
        <Check
          label={L.caseSensitive}
          value={caseSensitive}
          onChange={setCaseSensitive}
        />
        <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
          {fill(L.items, { count: result.length })}
        </span>
      </div>

      <Split orientation="column">
        <Split>
          <Panel title={L.listA}>
            <CodeField
              value={listA}
              onChange={setListA}
              placeholder={L.hintA}
            />
          </Panel>
          <Panel title={L.listB}>
            <CodeField
              value={listB}
              onChange={setListB}
              placeholder={L.hintB}
            />
          </Panel>
        </Split>

        <Panel title={L.result} actions={<CopyButton getText={() => output} />}>
          <CodeField
            value={output}
            readOnly
            placeholder={L.resultHint}
          />
        </Panel>
      </Split>
    </div>
  );
}
