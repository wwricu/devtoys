"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CopyButton,
  editorClass,
  Panel,
  Segmented,
  Split,
  StatusLine,
  ToolButton,
  type Indent,
  useIndentOptions,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  firstJsonError,
  processJson,
  unescapeJsonInput,
  type SortKeys,
} from "./format";
import { strings } from "./locale";

// Its own chunk, and never part of the prerendered body: see components/CodeEditor.
const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
});

export default function JsonFormatter() {
  const { t } = useLang();
  const L = useText(strings);
  const indentOptions = useIndentOptions();
  const [input, setInput] = useState("");
  const [indent, setIndent] = useStoredState<Indent>("json-format.indent", "2");
  const [sortKeys, setSortKeys] = useStoredState<SortKeys>(
    "json-format.sort",
    "none",
  );
  const [unescape, setUnescape] = useStoredState(
    "json-format.unescape",
    false,
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editing = useRef(false);
  const [rich, setRich] = useState(false);

  // The editor is an extra chunk. Fetch it in the background and take over the
  // input only once the user is not typing in the textarea anymore.
  useEffect(() => {
    let cancelled = false;
    import("@/components/CodeEditor")
      .then(() => {
        if (!cancelled && !editing.current) setRich(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const validate = useCallback(
    (text: string) => firstJsonError(unescape ? unescapeJsonInput(text) : text),
    [unescape],
  );

  const sortOptions: { value: SortKeys; label: string }[] = [
    { value: "none", label: L.sortOff },
    { value: "asc", label: "A-Z" },
    { value: "desc", label: "Z-A" },
  ];

  const result = useMemo(
    () => processJson(input, { indent, sortKeys, unescape }),
    [input, indent, sortKeys, unescape],
  );

  const download = useCallback(() => {
    if (!result.output) return;
    const blob = new Blob([result.output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [result.output]);

  const loadFile = useCallback(() => {
    const inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = ".json,.txt,application/json";
    inputEl.onchange = () => {
      const file = inputEl.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setInput(String(reader.result ?? ""));
      reader.readAsText(file);
    };
    inputEl.click();
  }, []);

  const inLines = input ? input.split("\n").length : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {L.indent}
          </span>
          <Segmented
            ariaLabel={L.indentation}
            value={indent}
            options={indentOptions}
            onChange={setIndent}
          />
        </div>
        <div className="ml-2 flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {L.sortKeys}
          </span>
          <Segmented
            ariaLabel={L.sortKeys}
            value={sortKeys}
            options={sortOptions}
            onChange={setSortKeys}
          />
        </div>
        <label
          title={L.unescapeHint}
          className="ml-2 flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400"
        >
          <input
            type="checkbox"
            checked={unescape}
            onChange={(e) => setUnescape(e.target.checked)}
            className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
          />
          {L.unescape}
        </label>
        <ToolButton
          onClick={() => {
            if (result.output) setInput(result.output);
          }}
          title={t.outputToInputHint}
        >
          {t.outputToInput}
        </ToolButton>
      </div>

      <Split>
        <Panel
          title={t.input}
          actions={
            <>
              <ToolButton onClick={loadFile} title={L.openFileHint}>
                {L.openFile}
              </ToolButton>
              <ToolButton
                onClick={() => {
                  setInput("");
                  // Whichever field is showing owns the caret after clearing.
                  (
                    inputRef.current ??
                    document.querySelector<HTMLElement>(".cm-content")
                  )?.focus();
                }}
                title={L.clearHint}
              >
                {t.clear}
              </ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          {rich ? (
            <CodeEditor
              value={input}
              onChange={setInput}
              validate={validate}
              placeholder={unescape ? L.unescapePlaceholder : L.pasteHint}
            />
          ) : (
            <textarea
              ref={inputRef}
              className={editorClass}
              spellCheck={false}
              placeholder={unescape ? L.unescapePlaceholder : L.pasteHint}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => {
                editing.current = true;
              }}
              onBlur={() => {
                editing.current = false;
                setRich(true);
              }}
            />
          )}
        </Panel>

        <Panel
          title={t.output}
          actions={
            <>
              <ToolButton onClick={download} title={L.downloadHint}>
                {L.download}
              </ToolButton>
              <CopyButton getText={() => result.output} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder={L.formatted}
            value={result.output}
          />
        </Panel>
      </Split>

      {result.errors && result.errors.length > 1 && (
        <div className="max-h-28 shrink-0 overflow-y-auto rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {result.errors.map((e, i) => (
            <div key={i}>
              {fill(t.lineCol, { line: e.line, col: e.column })}: {e.message}
            </div>
          ))}
        </div>
      )}

      <StatusLine
        error={result.error}
        info={
          result.output
            ? fill(L.stats, {
                lines: inLines,
                chars: input.length,
                out: result.output.length,
              })
            : input
              ? L.valid
              : ""
        }
      />
    </div>
  );
}
