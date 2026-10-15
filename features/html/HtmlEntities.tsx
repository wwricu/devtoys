"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { useText } from "@/lib/i18n";
import { decodeHtml, encodeHtml } from "./format";
import { strings } from "./locale";

type Mode = "encode" | "decode";

export default function HtmlEntities() {
  const L = useText(strings);
  const [mode, setMode] = useStoredState<Mode>("html.mode", "encode");
  const [encodeNonAscii, setEncodeNonAscii] = useStoredState<boolean>(
    "html.nonascii",
    false,
  );

  const modeOptions: { value: Mode; label: string }[] = [
    { value: "encode", label: L.encode },
    { value: "decode", label: L.decode },
  ];

  return (
    <SimpleTransform
      inputPlaceholder={mode === "encode" ? L.encodeHint : L.decodeHint}
      controls={
        <>
          <Segmented
            ariaLabel={L.mode}
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
              {L.nonAscii}
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
