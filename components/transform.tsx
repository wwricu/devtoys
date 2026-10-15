"use client";

import { useState } from "react";
import { CopyButton, Panel, StatusLine, ToolButton, editorClass } from "./kit";
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
}: {
  controls?: React.ReactNode;
  run: (input: string) => TransformResult;
  inputPlaceholder?: string;
  outputPlaceholder?: string;
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
      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title={t.input}
          actions={
            <>
              <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={inputPlaceholder ?? t.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
      </div>
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
