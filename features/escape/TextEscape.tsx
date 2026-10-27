"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  editorClass,
  Panel,
  Segmented,
  Split,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { escapeString, unescapeString } from "./format";
import { strings } from "./locale";

type Mode = "escape" | "unescape";

export default function TextEscape() {
  const { t } = useLang();
  const L = useText(strings);
  const [mode, setMode] = useStoredState<Mode>("escape.mode", "escape");
  const [escapeUnicode, setEscapeUnicode] = useStoredState<boolean>(
    "escape.unicode",
    false,
  );
  const [wrapQuotes, setWrapQuotes] = useStoredState<boolean>(
    "escape.wrap",
    false,
  );
  const [input, setInput] = useState("");

  const modeOptions: { value: Mode; label: string }[] = [
    { value: "escape", label: L.escape },
    { value: "unescape", label: L.unescape },
  ];

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
          ariaLabel={L.mode}
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
              {L.escapeUnicode}
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={wrapQuotes}
                onChange={(e) => setWrapQuotes(e.target.checked)}
                className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
              />
              {L.wrapQuotes}
            </label>
          </>
        )}
        <ToolButton onClick={swap} title={t.outputToInputHint}>
          {t.outputToInput}
        </ToolButton>
      </div>

      <Split>
        <Panel
          title={t.input}
          actions={
            <>
              <ToolButton onClick={() => setInput("")} title={L.clearHint}>
                {t.clear}
              </ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={mode === "escape" ? L.escapeHint : L.unescapeHint}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>

        <Panel title={t.output} actions={<CopyButton getText={() => output} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder={t.result}
            value={output}
          />
        </Panel>
      </Split>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? fill(t.ioChars, { input: input.length, output: output.length })
            : input
              ? L.noChange
              : ""
        }
      />
    </div>
  );
}
