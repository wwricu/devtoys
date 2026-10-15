"use client";

import { useEffect, useState } from "react";
import {
  CopyButton,
  Segmented,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { generateUuids, type UuidOptions } from "./format";

const versionOptions: { value: "1" | "4"; label: string }[] = [
  { value: "4", label: "v4 (random)" },
  { value: "1", label: "v1 (time)" },
];

export default function UuidGenerator() {
  const [version, setVersion] = useStoredState<"1" | "4">("uuid.version", "4");
  const [count, setCount] = useStoredState<number>("uuid.count", 5);
  const [uppercase, setUppercase] = useStoredState<boolean>(
    "uuid.upper",
    false
  );
  const [noDashes, setNoDashes] = useStoredState<boolean>(
    "uuid.dashes",
    false
  );
  const [list, setList] = useState<string[]>([]);

  const gen = () =>
    setList(
      generateUuids({
        version: Number(version) as 1 | 4,
        count: Math.min(500, Math.max(1, count)),
        uppercase,
        noDashes,
      })
    );

  useEffect(gen, []);

  const all = list.join("\n");

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Version"
          value={version}
          options={versionOptions}
          onChange={setVersion}
        />
        <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          Count
          <input
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-16 rounded border border-neutral-300 bg-white px-1.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
            className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
          />
          Uppercase
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={noDashes}
            onChange={(e) => setNoDashes(e.target.checked)}
            className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
          />
          No dashes
        </label>
        <ToolButton onClick={gen}>Regenerate</ToolButton>
        <CopyButton getText={() => all} />
      </div>
      <div className="flex flex-col rounded border border-neutral-200 dark:border-neutral-800">
        {list.map((u, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2 border-b border-neutral-100 px-2 py-1 last:border-0 dark:border-neutral-800"
          >
            <span className="font-mono text-xs">{u}</span>
            <CopyButton getText={() => u} />
          </div>
        ))}
      </div>
    </div>
  );
}
