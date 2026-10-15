"use client";

import { useState } from "react";
import { CopyButton, Panel, StatusLine, ToolButton, editorClass } from "./kit";

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
  outputPlaceholder = "Result",
}: {
  controls?: React.ReactNode;
  run: (input: string) => TransformResult;
  inputPlaceholder?: string;
  outputPlaceholder?: string;
}) {
  const [input, setInput] = useState("");
  const { output, error, note } = run(input);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {controls}
        <ToolButton
          onClick={() => setInput(output)}
          title="Move output back into the input"
        >
          Output → Input
        </ToolButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title="Input"
          actions={
            <>
              <ToolButton onClick={() => setInput("")}>Clear</ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={inputPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel title="Output" actions={<CopyButton getText={() => output} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder={outputPlaceholder}
            value={output}
          />
        </Panel>
      </div>
      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? `${note ? note + " · " : ""}Input ${input.length} · Output ${output.length} chars`
            : input
              ? "Ready"
              : ""
        }
      />
    </div>
  );
}
