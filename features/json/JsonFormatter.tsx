"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  StatusLine,
  ToolButton,
  editorClass,
  indentOptions,
  useStoredState,
  type Indent,
} from "@/components/kit";
import { processJson, type SortKeys } from "./format";

const sortOptions: { value: SortKeys; label: string }[] = [
  { value: "none", label: "Off" },
  { value: "asc", label: "A-Z" },
  { value: "desc", label: "Z-A" },
];

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useStoredState<Indent>("json-format.indent", "2");
  const [sortKeys, setSortKeys] = useStoredState<SortKeys>(
    "json-format.sort",
    "none"
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const result = useMemo(
    () => processJson(input, { indent, sortKeys }),
    [input, indent, sortKeys]
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
          Indent
        </span>
        <Segmented
          ariaLabel="Indentation"
          value={indent}
          options={indentOptions}
          onChange={setIndent}
        />
        <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
          Sort keys
        </span>
        <Segmented
          ariaLabel="Sort keys"
          value={sortKeys}
          options={sortOptions}
          onChange={setSortKeys}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title="Input"
          actions={
            <>
              <ToolButton onClick={loadFile} title="Load from a local file">
                Open file
              </ToolButton>
              <ToolButton
                onClick={() => {
                  setInput("");
                  inputRef.current?.focus();
                }}
                title="Clear input"
              >
                Clear
              </ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            ref={inputRef}
            className={editorClass}
            spellCheck={false}
            placeholder="Paste JSON here…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>

        <Panel
          title="Output"
          actions={
            <>
              <ToolButton onClick={download} title="Download the output file">
                Download
              </ToolButton>
              <CopyButton getText={() => result.output} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder="Formatted result"
            value={result.output}
          />
        </Panel>
      </div>

      {result.errors && result.errors.length > 1 && (
        <div className="max-h-28 shrink-0 overflow-y-auto rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {result.errors.map((e, i) => (
            <div key={i}>
              Line {e.line}, col {e.column}: {e.message}
            </div>
          ))}
        </div>
      )}

      <StatusLine
        error={result.error}
        info={
          result.output
            ? `Input ${inLines} lines / ${input.length} chars · Output ${result.output.length} chars`
            : input
              ? "Valid JSON, no errors"
              : ""
        }
      />
    </div>
  );
}
