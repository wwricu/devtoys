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
import { decodeToText, encodeText } from "./format";

type Mode = "encode" | "decode";

const modeOptions: { value: Mode; label: string }[] = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
];

export default function Base64Tool() {
  const [mode, setMode] = useStoredState<Mode>("base64.mode", "encode");
  const [urlSafe, setUrlSafe] = useStoredState<boolean>(
    "base64.urlsafe",
    false
  );
  const [input, setInput] = useState("");

  const { output, error } = useMemo(() => {
    if (input === "") return { output: "", error: null as string | null };
    try {
      if (mode === "encode")
        return { output: encodeText(input, { urlSafe }), error: null };
      return { output: decodeToText(input), error: null };
    } catch (e) {
      return {
        output: "",
        error: e instanceof Error ? e.message : "Invalid Base64 input",
      };
    }
  }, [input, mode, urlSafe]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Mode"
          value={mode}
          options={modeOptions}
          onChange={setMode}
        />
        {mode === "encode" && (
          <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={urlSafe}
              onChange={(e) => setUrlSafe(e.target.checked)}
              className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
            />
            URL-safe alphabet
          </label>
        )}
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
            placeholder={
              mode === "encode" ? "Text to encode…" : "Base64 to decode…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel title="Output" actions={<CopyButton getText={() => output} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            value={output}
            placeholder="Result"
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? `Input ${input.length} · Output ${output.length} chars`
            : input
              ? "Ready"
              : ""
        }
      />
    </div>
  );
}
