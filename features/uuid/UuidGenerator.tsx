"use client";

import { useState } from "react";
import {
  CopyButton,
  Segmented,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { useLang, useText } from "@/lib/i18n";
import { generateUuids } from "./format";
import { strings } from "./locale";

export default function UuidGenerator() {
  const { t } = useLang();
  const L = useText(strings);
  const [version, setVersion] = useStoredState<"1" | "4">("uuid.version", "4");
  const [count, setCount] = useStoredState<number>("uuid.count", 5);
  const [uppercase, setUppercase] = useStoredState<boolean>(
    "uuid.upper",
    false,
  );
  const [noDashes, setNoDashes] = useStoredState<boolean>("uuid.dashes", false);
  // Generated once on mount, exactly like the previous effect did; the tool
  // chunk is client-only (dynamic ssr:false), so the random ids never hydrate.
  const buildList = () =>
    generateUuids({
      version: Number(version) as 1 | 4,
      count: Math.min(500, Math.max(1, count)),
      uppercase,
      noDashes,
    });

  const [list, setList] = useState<string[]>(buildList);

  const versionOptions: { value: "1" | "4"; label: string }[] = [
    { value: "4", label: L.v4 },
    { value: "1", label: L.v1 },
  ];

  const all = list.join("\n");

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel={L.version}
          value={version}
          options={versionOptions}
          onChange={setVersion}
        />
        <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          {L.count}
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
          {L.uppercase}
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={noDashes}
            onChange={(e) => setNoDashes(e.target.checked)}
            className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
          />
          {L.noDashes}
        </label>
        <ToolButton onClick={() => setList(buildList())}>
          {L.regenerate}
        </ToolButton>
        <CopyButton getText={() => all} />
      </div>
      <div
        role="list"
        aria-label={t.result}
        className="flex flex-col rounded border border-neutral-200 dark:border-neutral-800"
      >
        {list.map((u, i) => (
          <div
            key={i}
            role="listitem"
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
