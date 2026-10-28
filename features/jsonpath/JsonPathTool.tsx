"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  Split,
  ToolButton,
  editorClass,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { evaluateJsonPath, type JsonValue } from "./format";
import { strings } from "./locale";

const pathClass =
  "w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

export default function JsonPathTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [json, setJson] = useState("");
  const [path, setPath] = useState("$");

  const parsed = useMemo((): {
    value: JsonValue | undefined;
    error: string | null;
  } => {
    if (json.trim() === "") return { value: undefined, error: null };
    try {
      return { value: JSON.parse(json) as JsonValue, error: null };
    } catch (error) {
      return {
        value: undefined,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [json]);

  const result = useMemo(() => {
    if (parsed.value === undefined || path.trim() === "") return null;
    return evaluateJsonPath(parsed.value, path);
  }, [parsed, path]);

  const matches = result?.matches ?? null;
  const copyText = matches
    ? JSON.stringify(
        matches.map((m) => m.value),
        null,
        2,
      )
    : "";

  const cheatSheet: [string, string][] = [
    ["$", L.cheatRoot],
    ["@", L.cheatCurrent],
    [".name / ['name']", L.cheatChild],
    ["..name", L.cheatRecursive],
    ["* / ..*", L.cheatWildcard],
    ["[0] / [-1]", L.cheatIndex],
    ["[0,2] / ['a','b']", L.cheatUnion],
    ["[start:end:step]", L.cheatSlice],
    ["[?(@.price < 10)]", L.cheatFilter],
    ["@.a == 1 && @.b", L.cheatLogic],
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <input
          className={pathClass}
          aria-label={L.pathAria}
          placeholder={L.pathPlaceholder}
          spellCheck={false}
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        {result?.error && (
          <p className="font-mono text-xs text-red-600 dark:text-red-400">
            {L.invalidPath} {result.error.message}{" "}
            <span className="text-neutral-400">
              (position {result.error.position})
            </span>
          </p>
        )}
      </div>

      <Split>
        <Panel
          title={L.json}
          actions={
            json !== "" ? (
              <ToolButton onClick={() => setJson("")}>{t.clear}</ToolButton>
            ) : undefined
          }
        >
          {parsed.error && (
            <p className="border-b border-neutral-100 px-2 py-1 font-mono text-[11px] text-red-600 dark:border-neutral-800 dark:text-red-400">
              {L.invalidJson} {parsed.error}
            </p>
          )}
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={L.jsonHint}
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
        </Panel>

        <Panel
          title={L.result}
          actions={
            <>
              {matches && matches.length > 0 && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {fill(L.matches, { count: matches.length })}
                </span>
              )}
              <CopyButton getText={() => copyText} />
            </>
          }
        >
          {matches === null || matches.length === 0 ? (
            <p className="p-3 text-xs text-neutral-400 dark:text-neutral-500">
              {matches === null ? L.resultHint : L.noMatch}
            </p>
          ) : (
            <div className="min-h-0 flex-1 divide-y divide-neutral-100 overflow-auto dark:divide-neutral-800">
              {matches.map((match, index) => {
                const value = JSON.stringify(match.value) ?? "null";
                return (
                  <div
                    key={`${match.path}-${index}`}
                    className="flex items-baseline gap-2 px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                  >
                    <span
                      className="w-[45%] shrink-0 truncate font-mono text-[11px] text-neutral-400 dark:text-neutral-500"
                      title={match.path}
                    >
                      {match.path}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-800 dark:text-neutral-200"
                      title={value}
                    >
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </Split>

      <details className="text-xs">
        <summary className="cursor-pointer select-none text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
          {L.cheatSheet}
        </summary>
        <div className="mt-1 grid max-h-40 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto sm:grid-cols-2">
          {cheatSheet.map(([syntax, meaning]) => (
            <div key={syntax} className="flex gap-2">
              <code className="shrink-0 font-mono text-neutral-700 dark:text-neutral-300">
                {syntax}
              </code>
              <span className="text-neutral-500 dark:text-neutral-400">
                {meaning}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
