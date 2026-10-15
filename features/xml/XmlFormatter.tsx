"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  StatusLine,
  ToolButton,
  editorClass,
  useIndentOptions,
  useStoredState,
  type Indent,
} from "@/components/kit";
import { processXml } from "./format";

export default function XmlFormatter() {
  const indentOptions = useIndentOptions();
  const [input, setInput] = useState("");
  const [indent, setIndent] = useStoredState<Indent>("xml-format.indent", "2");
  const [preserveComments, setPreserveComments] = useStoredState<boolean>(
    "xml-format.comments",
    true
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const result = useMemo(
    () => processXml(input, { indent, preserveComments }),
    [input, indent, preserveComments]
  );

  const download = useCallback(() => {
    if (!result.output) return;
    const blob = new Blob([result.output], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.xml";
    a.click();
    URL.revokeObjectURL(url);
  }, [result.output]);

  const loadFile = useCallback(() => {
    const inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = ".xml,.xsd,.txt,application/xml,text/xml";
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
        <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={preserveComments}
            onChange={(e) => setPreserveComments(e.target.checked)}
            className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
          />
          Keep comments
        </label>
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
            placeholder="Paste XML here…"
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

      <StatusLine
        error={result.error}
        info={
          result.output
            ? `Input ${inLines} lines / ${input.length} chars · Output ${result.output.length} chars`
            : input
              ? "Valid XML, no errors"
              : ""
        }
      />
    </div>
  );
}
