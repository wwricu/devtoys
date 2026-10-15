"use client";

import { useMemo, useState } from "react";
import { CopyButton, ToolButton, flowEditorClass } from "@/components/kit";
import { useLang, useText } from "@/lib/i18n";
import { toCases } from "./format";
import { strings } from "./locale";

export default function CaseConverter() {
  const { t } = useLang();
  const L = useText(strings);
  const [input, setInput] = useState("");
  const cases = useMemo(() => toCases(input), [input]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">{t.input}</span>
        <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
      </div>
      <textarea
        className={flowEditorClass}
        spellCheck={false}
        placeholder={L.styleHint}
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
