"use client";

import { useEffect, useState } from "react";
import { CopyButton, ToolButton, flowEditorClass } from "@/components/kit";
import { useLang, useText } from "@/lib/i18n";
import { hashAll, type HashOutput } from "./format";
import { strings } from "./locale";

export default function HashTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<HashOutput[]>([]);

  useEffect(() => {
    let alive = true;
    const id = setTimeout(() => {
      if (input === "") {
        setHashes([]);
        return;
      }
      hashAll(input).then((h) => {
        if (alive) setHashes(h);
      });
    }, 120);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [input]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {t.input}
        </span>
        <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
      </div>
      <textarea
        className={flowEditorClass}
        spellCheck={false}
        placeholder={L.hashHint}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex flex-col">
        {hashes.map((h) => (
          <div
            key={h.algorithm}
            className="flex items-center gap-2 border-b border-neutral-100 py-1.5 dark:border-neutral-800"
          >
            <span className="w-20 shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {h.algorithm}
            </span>
            <span className="min-w-0 flex-1 break-all font-mono text-xs">
              {h.hex}
            </span>
            <CopyButton getText={() => h.hex} />
          </div>
        ))}
        {input !== "" && hashes.length === 0 && (
          <p className="py-2 text-xs text-neutral-400">{L.computing}</p>
        )}
      </div>
    </div>
  );
}
