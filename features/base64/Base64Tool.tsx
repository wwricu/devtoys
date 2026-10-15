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
import { fill, useLang, useText } from "@/lib/i18n";
import { decodeToText, encodeText } from "./format";
import { strings } from "./locale";

type Mode = "encode" | "decode";

export default function Base64Tool() {
  const { t } = useLang();
  const L = useText(strings);
  const [mode, setMode] = useStoredState<Mode>("base64.mode", "encode");
  const [urlSafe, setUrlSafe] = useStoredState<boolean>(
    "base64.urlsafe",
    false,
  );
  const [input, setInput] = useState("");

  const modeOptions: { value: Mode; label: string }[] = [
    { value: "encode", label: L.encode },
    { value: "decode", label: L.decode },
  ];

  const { output, error } = useMemo(() => {
    if (input === "") return { output: "", error: null as string | null };
    try {
      if (mode === "encode")
        return { output: encodeText(input, { urlSafe }), error: null };
      return { output: decodeToText(input), error: null };
    } catch (e) {
      return {
        output: "",
        error: e instanceof Error ? e.message : L.invalidInput,
      };
    }
  }, [input, mode, urlSafe, L]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel={L.mode}
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
            {L.urlSafe}
          </label>
        )}
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
            placeholder={mode === "encode" ? L.encodeHint : L.decodeHint}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel title={t.output} actions={<CopyButton getText={() => output} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            value={output}
            placeholder={t.result}
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? fill(t.ioChars, { input: input.length, output: output.length })
            : input
              ? t.ready
              : ""
        }
      />
    </div>
  );
}
