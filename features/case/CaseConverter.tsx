"use client";

import { useMemo, useState } from "react";
import { CopyButton, ToolButton, editorClass } from "@/components/kit";
import { toCases } from "./format";

export default function CaseConverter() {
  const [input, setInput] = useState("");
  const cases = useMemo(() => toCases(input), [input]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">Input</span>
        <ToolButton onClick={() => setInput("")}>Clear</ToolButton>
      </div>
      <textarea
        className={editorClass + " min-h-24 flex-none rounded border border-neutral-200 dark:border-neutral-800"}
        spellCheck={false}
        placeholder="Type text in any case (the_house, theHouse, The House)…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {cases.map((c) => (
          <div
            key={c.label}
            className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1 dark:border-neutral-800"
          >
            <span className="w-32 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
              {c.label}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs">
              {c.value}
            </span>
            <CopyButton getText={() => c.value} />
          </div>
        ))}
      </div>
    </div>
  );
}
