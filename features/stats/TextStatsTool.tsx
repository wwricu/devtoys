"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel, ToolButton, editorClass } from "@/components/kit";
import { computeStats, duration } from "./format";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 px-2 py-1.5 dark:border-neutral-800">
      <p className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

export default function TextStatsTool() {
  const [text, setText] = useState("");
  const stats = useMemo(() => computeStats(text), [text]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 md:flex-row">
      <Panel
        title="Text"
        className="md:flex-[2]"
        actions={
          <>
            <ToolButton onClick={() => setText("")}>Clear</ToolButton>
            <CopyButton getText={() => text} />
          </>
        }
      >
        <textarea
          className={editorClass}
          spellCheck={false}
          placeholder="Type or paste text…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Panel>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto md:flex-[1]">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Characters" value={String(stats.characters)} />
          <Metric label="No spaces" value={String(stats.charactersNoSpaces)} />
          <Metric label="Words" value={String(stats.words)} />
          <Metric label="Unique words" value={String(stats.uniqueWords)} />
          <Metric label="Sentences" value={String(stats.sentences)} />
          <Metric label="Paragraphs" value={String(stats.paragraphs)} />
          <Metric label="Lines" value={String(stats.lines)} />
          <Metric label="Bytes UTF-8" value={String(stats.bytes)} />
          <Metric label="Avg word length" value={String(stats.avgWordLength)} />
          <Metric label="Longest word" value={stats.longestWord || "-"} />
          <Metric label="Reading time" value={duration(stats.readingSeconds)} />
          <Metric label="Speaking time" value={duration(stats.speakingSeconds)} />
        </div>

        <Panel title="Frequent words">
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {stats.frequencies.length === 0 ? (
              <p className="text-xs text-neutral-400">No words yet.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <tbody>
                  {stats.frequencies.map((f) => (
                    <tr
                      key={f.word}
                      className="border-b border-neutral-100 dark:border-neutral-800"
                    >
                      <td className="w-8 py-1 text-neutral-400">{f.count}</td>
                      <td className="py-1 break-all">{f.word}</td>
                      <td className="w-24 py-1">
                        <div className="h-1.5 rounded bg-neutral-200 dark:bg-neutral-700">
                          <div
                            className="h-1.5 rounded bg-neutral-500 dark:bg-neutral-400"
                            style={{
                              width: `${Math.round((f.count / stats.frequencies[0].count) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
