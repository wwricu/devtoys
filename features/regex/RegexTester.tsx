"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  editorClass,
  Panel,
  Split,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { replaceWith, runRegex, segments } from "./format";
import { strings } from "./locale";

export default function RegexTester() {
  const { t } = useLang();
  const L = useText(strings);
  const [pattern, setPattern] = useState("");
  const [text, setText] = useState("");
  const [replacement, setReplacement] = useState("");
  const [flags, setFlags] = useStoredState("regex.flags", "gm");

  const flagOptions: { value: string; hint: string }[] = [
    { value: "g", hint: L.flagGlobal },
    { value: "i", hint: L.flagIgnoreCase },
    { value: "m", hint: L.flagMultiline },
    { value: "s", hint: L.flagDotAll },
    { value: "u", hint: L.flagUnicode },
    { value: "y", hint: L.flagSticky },
  ];

  const run = useMemo(
    () => runRegex(pattern, text, flags),
    [pattern, text, flags],
  );
  const parts = useMemo(() => segments(text, run.matches), [text, run.matches]);
  const replaced = useMemo(
    () => replaceWith(pattern, text, flags, replacement),
    [pattern, text, flags, replacement],
  );

  const toggleFlag = (f: string) => {
    const next = flags.includes(f) ? flags.replace(f, "") : flags + f;
    setFlags(next);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-64 flex-1 items-center gap-1 rounded border border-neutral-300 bg-white px-2 dark:border-neutral-700 dark:bg-neutral-800">
          <span className="text-xs text-neutral-400">/</span>
          <input
            className="min-w-0 flex-1 bg-transparent py-1 font-mono text-xs outline-none placeholder:text-neutral-400"
            spellCheck={false}
            placeholder={L.patternHint}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          />
          <span className="text-xs text-neutral-400">/</span>
          <span className="w-14 font-mono text-xs text-neutral-500">
            {flags}
          </span>
        </div>
        <div
          role="group"
          aria-label={L.flags}
          className="flex items-center gap-1"
        >
          {flagOptions.map((f) => (
            <button
              key={f.value}
              type="button"
              title={f.hint}
              onClick={() => toggleFlag(f.value)}
              className={`rounded border px-2 py-1 font-mono text-xs ${
                flags.includes(f.value)
                  ? "border-neutral-800 bg-neutral-800 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900"
                  : "border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              }`}
            >
              {f.value}
            </button>
          ))}
        </div>
      </div>

      {run.error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 font-mono text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {run.error}
        </div>
      )}

      <Split orientation="column">
        <Split>
          <Panel
            title={L.testString}
            actions={
              <ToolButton onClick={() => setText("")}>{t.clear}</ToolButton>
            }
          >
            <textarea
              className={editorClass}
              spellCheck={false}
              placeholder={L.textHint}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Panel>
          <Panel
            title={fill(L.matches, { count: run.matches.length })}
            actions={
              <CopyButton
                getText={() => run.matches.map((m) => m.value).join("\n")}
              />
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <pre className="mb-2 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
                {parts.map((s, i) =>
                  s.matched ? (
                    <mark
                      key={i}
                      title={fill(L.matchNumber, { n: s.ordinal })}
                      className="rounded-sm bg-amber-200 text-neutral-900 dark:bg-amber-500/40 dark:text-neutral-100"
                    >
                      {s.text}
                    </mark>
                  ) : (
                    <span key={i}>{s.text}</span>
                  ),
                )}
              </pre>
              {run.matches.length === 0 && pattern !== "" && text !== "" && (
                <p className="text-xs text-neutral-400">{L.noMatch}</p>
              )}
              {run.matches.length > 0 && (
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-neutral-400">
                      <th className="py-1 pr-2 font-normal">#</th>
                      <th className="py-1 pr-2 font-normal">{L.colIndex}</th>
                      <th className="py-1 pr-2 font-normal">{L.colMatch}</th>
                      <th className="py-1 font-normal">{L.colGroups}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.matches.slice(0, 500).map((m, i) => (
                      <tr
                        key={i}
                        className="border-t border-neutral-100 align-top dark:border-neutral-800"
                      >
                        <td className="py-1 pr-2 text-neutral-400">{i + 1}</td>
                        <td className="py-1 pr-2 text-neutral-500">
                          {m.index}
                        </td>
                        <td className="py-1 pr-2 break-all">{m.value}</td>
                        <td className="py-1 break-all text-neutral-500">
                          {m.groups.length === 0
                            ? "-"
                            : m.groups
                                .map(
                                  (g) =>
                                    `${g.label}=${g.value === "" ? '""' : g.value}`,
                                )
                                .join("  ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Panel>
        </Split>

        <Panel
          title={L.replace}
          actions={<CopyButton getText={() => replaced} />}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-1 p-2">
            <input
              className="rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
              spellCheck={false}
              placeholder={L.replacementHint}
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
            />
            <textarea
              className={
                editorClass +
                " min-h-16 rounded border border-neutral-200 dark:border-neutral-800"
              }
              spellCheck={false}
              readOnly
              placeholder={L.replacementResult}
              value={replaced}
            />
          </div>
        </Panel>
      </Split>
    </div>
  );
}
