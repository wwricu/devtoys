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
import { processXml } from "./format";
import { strings } from "./locale";

export default function XmlFormatter() {
  const { t } = useLang();
  const L = useText(strings);
  const indentOptions = useIndentOptions();
  const [input, setInput] = useState("");
  const [indent, setIndent] = useStoredState<Indent>("xml-format.indent", "2");
  const [preserveComments, setPreserveComments] = useStoredState<boolean>(
    "xml-format.comments",
    true,
  );
  const [unescape, setUnescape] = useStoredState<boolean>(
    "xml-format.unescape",
    false,
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const result = useMemo(
    () => processXml(input, { indent, preserveComments, unescape }),
    [input, indent, preserveComments, unescape],
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
          {L.fmtIndent}
        </span>
        <Segmented
          ariaLabel={L.fmtIndentation}
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
          {L.fmtKeepComments}
        </label>
        <label
          title={L.fmtUnescapeHint}
          className="ml-2 flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400"
        >
          <input
            type="checkbox"
            checked={unescape}
            onChange={(e) => setUnescape(e.target.checked)}
            className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
          />
          {L.fmtUnescape}
        </label>
      </div>

      <Split>
        <Panel
          title={t.input}
          actions={
            <>
              <ToolButton onClick={loadFile} title={L.fmtOpenFileHint}>
                {L.fmtOpenFile}
              </ToolButton>
              <ToolButton
                onClick={() => {
                  setInput("");
                  inputRef.current?.focus();
                }}
                title={L.fmtClearHint}
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
            placeholder={unescape ? L.fmtPasteEscapedHint : L.fmtPasteHint}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>

        <Panel
          title={t.output}
          actions={
            <>
              <ToolButton onClick={download} title={L.fmtDownloadHint}>
                {L.fmtDownload}
              </ToolButton>
              <CopyButton getText={() => result.output} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder={L.fmtFormatted}
            value={result.output}
          />
        </Panel>
      </Split>

      <StatusLine
        error={result.error}
        info={
          result.output
            ? fill(L.fmtStats, {
                lines: inLines,
                chars: input.length,
                out: result.output.length,
              })
            : input
              ? L.fmtValid
              : ""
        }
      />
    </div>
  );
}
