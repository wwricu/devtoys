"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import { processJson, type SortKeys } from "./format";
import { strings } from "./locale";

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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sortOptions: { value: SortKeys; label: string }[] = [
    { value: "none", label: L.sortOff },
    { value: "asc", label: "A-Z" },
    { value: "desc", label: "Z-A" },
  ];

  const result = useMemo(
    () => processJson(input, { indent, sortKeys }),
    [input, indent, sortKeys],
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
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {L.indent}
        </span>
        <Segmented
          ariaLabel={L.indentation}
          value={indent}
          options={indentOptions}
          onChange={setIndent}
        />
        <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
          {L.sortKeys}
        </span>
        <Segmented
          ariaLabel={L.sortKeys}
          value={sortKeys}
          options={sortOptions}
          onChange={setSortKeys}
        />
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
                  inputRef.current?.focus();
                }}
                title={L.clearHint}
              >
                {t.clear}
              </ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            ref={inputRef}
            className={editorClass}
            spellCheck={false}
            placeholder={L.pasteHint}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
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
