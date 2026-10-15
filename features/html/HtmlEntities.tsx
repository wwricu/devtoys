"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { decodeHtml, encodeHtml } from "./format";

type Mode = "encode" | "decode";

const modeOptions: { value: Mode; label: string }[] = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
];

export default function HtmlEntities() {
  const [mode, setMode] = useStoredState<Mode>("html.mode", "encode");
  const [encodeNonAscii, setEncodeNonAscii] = useStoredState<boolean>(
    "html.nonascii",
    false
  );

  return (
    <SimpleTransform
      inputPlaceholder={
        mode === "encode"
          ? "Text with < & > \" characters…"
          : "Text with &amp; entities…"
      }
      controls={
        <>
          <Segmented
            ariaLabel="Mode"
            value={mode}
            options={modeOptions}
            onChange={setMode}
          />
          {mode === "encode" && (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={encodeNonAscii}
                onChange={(e) => setEncodeNonAscii(e.target.checked)}
                className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
              />
              Encode non-ASCII (&amp;#…;)
            </label>
          )}
        </>
      }
      run={(input) => {
        if (input === "") return { output: "", error: null };
        return {
          output:
            mode === "encode"
              ? encodeHtml(input, { encodeNonAscii })
              : decodeHtml(input),
          error: null,
        };
      }}
    />
  );
}
