"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel, ToolButton, editorClass } from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { computeStats, duration } from "./format";
import { strings } from "./locale";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 px-2 py-1.5 dark:border-neutral-800">
      <p className="text-[11px] uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

export default function TextStatsTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [text, setText] = useState("");
  const stats = useMemo(() => computeStats(text), [text]);

  const readTime = (seconds: number) => {
    const span = duration(seconds);
    if (span.minutes === 0) return fill(L.seconds, { seconds: span.seconds });
    if (span.seconds === 0) return fill(L.minutes, { minutes: span.minutes });
    return fill(L.minutesSeconds, {
      minutes: span.minutes,
      seconds: span.seconds,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 md:flex-row">
      <Panel
        title={L.text}
        className="md:flex-[2]"
        actions={
          <>
            <ToolButton onClick={() => setText("")}>{t.clear}</ToolButton>
            <CopyButton getText={() => text} />
          </>
        }
      >
        <textarea
          className={editorClass}
          spellCheck={false}
          placeholder={L.pasteHint}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Panel>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto md:flex-[1]">
        <div className="grid grid-cols-2 gap-2">
          <Metric label={L.characters} value={String(stats.characters)} />
          <Metric label={L.noSpaces} value={String(stats.charactersNoSpaces)} />
          <Metric label={L.words} value={String(stats.words)} />
          <Metric label={L.uniqueWords} value={String(stats.uniqueWords)} />
          <Metric label={L.sentences} value={String(stats.sentences)} />
          <Metric label={L.paragraphs} value={String(stats.paragraphs)} />
          <Metric label={L.lines} value={String(stats.lines)} />
          <Metric label={L.bytesUtf8} value={String(stats.bytes)} />
          <Metric label={L.avgWordLength} value={String(stats.avgWordLength)} />
          <Metric label={L.longestWord} value={stats.longestWord || "-"} />
          <Metric
            label={L.readingTime}
            value={readTime(stats.readingSeconds)}
          />
          <Metric
            label={L.speakingTime}
            value={readTime(stats.speakingSeconds)}
          />
        </div>

        <Panel title={L.frequentWords}>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {stats.frequencies.length === 0 ? (
              <p className="text-xs text-neutral-400">{L.noWordsYet}</p>
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
