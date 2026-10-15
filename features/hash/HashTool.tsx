"use client";

import { useEffect, useState } from "react";
import { CopyButton, ToolButton, editorClass } from "@/components/kit";
import { hashAll, type HashOutput } from "./format";

export default function HashTool() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<HashOutput[]>([]);

  useEffect(() => {
    if (input === "") {
      setHashes([]);
      return;
    }
    let alive = true;
    const id = setTimeout(() => {
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
          Input
        </span>
        <ToolButton onClick={() => setInput("")}>Clear</ToolButton>
      </div>
      <textarea
        className={
          editorClass +
          " min-h-24 flex-none rounded border border-neutral-200 dark:border-neutral-800"
        }
        spellCheck={false}
        placeholder="Text to hash…"
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
          <p className="py-2 text-xs text-neutral-400">Computing…</p>
        )}
      </div>
    </div>
  );
}
