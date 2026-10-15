"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  StatusLine,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { escapeString, unescapeString } from "./format";

type Mode = "escape" | "unescape";

const modeOptions: { value: Mode; label: string }[] = [
  { value: "escape", label: "Escape" },
  { value: "unescape", label: "Unescape" },
];

export default function TextEscape() {
  const [mode, setMode] = useStoredState<Mode>("escape.mode", "escape");
  const [escapeUnicode, setEscapeUnicode] = useStoredState<boolean>(
    "escape.unicode",
    false
  );
  const [wrapQuotes, setWrapQuotes] = useStoredState<boolean>(
    "escape.wrap",
    false
  );
  const [input, setInput] = useState("");

  const { output, error } = useMemo(() => {
    if (input === "") return { output: "", error: null };
    if (mode === "escape") {
      return {
        output: escapeString(input, { escapeUnicode, wrapQuotes }),
        error: null,
      };
    }
    const r = unescapeString(input);
    return { output: r.output, error: r.error };
  }, [input, mode, escapeUnicode, wrapQuotes]);

  const swap = () => {
    setInput(output);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Mode"
          value={mode}
          options={modeOptions}
          onChange={setMode}
        />
        {mode === "escape" && (
          <>
            <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={escapeUnicode}
                onChange={(e) => setEscapeUnicode(e.target.checked)}
                className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
              />
              Escape non-ASCII (\uXXXX)
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={wrapQuotes}
                onChange={(e) => setWrapQuotes(e.target.checked)}
                className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
              />
              Wrap in quotes
            </label>
          </>
        )}
        <ToolButton onClick={swap} title="Move output back into the input">
          Output → Input
        </ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title="Input"
          actions={
            <>
              <ToolButton onClick={() => setInput("")} title="Clear input">
                Clear
              </ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={
              mode === "escape"
                ? "Paste raw text to escape…"
                : "Paste escaped text to unescape…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>

        <Panel
          title="Output"
          actions={<CopyButton getText={() => output} />}
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder="Result"
            value={output}
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? `Input ${input.length} chars · Output ${output.length} chars`
            : input
              ? "No change"
              : ""
        }
      />
    </div>
  );
}
