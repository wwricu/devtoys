"use client";

import { useState } from "react";
import CodeField from "./CodeField";
import {
  CopyButton,
  Panel,
  Split,
  StatusLine,
  ToolButton,
  editorClass,
} from "./kit";
import type { SyntaxError as EditorSyntaxError } from "./CodeEditor";
import type { Extension } from "@codemirror/state";
import { fill, useLang } from "@/lib/i18n";

export interface TransformResult {
  output: string;
  error: string | null;
  /** optional remark about what the transform did, shown in the status line */
  note?: string;
}

/**
 * Shared layout for simple text-in / text-out tools:
 * a controls slot, paired input/output panels, and a status line.
 */
export function SimpleTransform({
  controls,
  run,
  inputPlaceholder,
  outputPlaceholder,
  extensions,
  validate,
}: {
  controls?: React.ReactNode;
  run: (input: string) => TransformResult;
  inputPlaceholder?: string;
  outputPlaceholder?: string;
  /** Grammar for the input box; omit it and the box stays a plain textarea. */
  extensions?: Extension[];
  validate?: (text: string) => EditorSyntaxError | null;
}) {
  const { t } = useLang();
  const [input, setInput] = useState("");
  const { output, error, note } = run(input);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {controls}
        <ToolButton
          onClick={() => setInput(output)}
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
              <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <CodeField
            value={input}
            onChange={setInput}
            extensions={extensions}
            validate={validate}
            placeholder={inputPlaceholder ?? t.input}
          />
        </Panel>
        <Panel title={t.output} actions={<CopyButton getText={() => output} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder={outputPlaceholder ?? t.result}
            value={output}
          />
        </Panel>
      </Split>
      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? `${note ? note + " · " : ""}${fill(t.ioChars, {
                input: input.length,
                output: output.length,
              })}`
            : input
              ? t.ready
              : ""
        }
      />
    </div>
  );
}
