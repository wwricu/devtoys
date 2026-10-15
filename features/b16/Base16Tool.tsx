"use client";

import { SimpleTransform } from "@/components/transform";
import { Segmented, useStoredState } from "@/components/kit";
import { useText } from "@/lib/i18n";
import { charTable, hexToText, textToHex, toEscapes } from "./format";
import { strings } from "./locale";

type Direction = "toHex" | "fromHex";
type Form = "hex" | "backslash-x" | "unicode" | "binary" | "html";

export default function Base16Tool() {
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "b16.direction",
    "toHex",
  );
  const [form, setForm] = useStoredState<Form>("b16.form", "hex");

  const directionOptions: { value: Direction; label: string }[] = [
    { value: "toHex", label: L.toHex },
    { value: "fromHex", label: L.fromHex },
  ];

  // The `\x`, `\u` and `&#dec;` labels are notation literals, not words.
  const formOptions: { value: Form; label: string }[] = [
    { value: "hex", label: L.hex },
    { value: "backslash-x", label: "\\x" },
    { value: "unicode", label: "\\u" },
    { value: "binary", label: L.binary },
    { value: "html", label: "&#dec;" },
  ];

  return (
    <SimpleTransform
      controls={
        <>
          <Segmented
            value={direction}
            options={directionOptions}
            onChange={setDirection}
            ariaLabel={L.direction}
          />
          {direction === "toHex" && (
            <Segmented
              value={form}
              options={formOptions}
              onChange={setForm}
              ariaLabel={L.notation}
            />
          )}
        </>
      }
      inputPlaceholder={direction === "toHex" ? L.textHint : L.hexHint}
      run={(input) => {
        if (direction === "fromHex") {
          try {
            return { output: hexToText(input), error: null };
          } catch (err) {
            return {
              output: "",
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }
        if (input === "") return { output: "", error: null };
        const escapes = toEscapes(input);
        switch (form) {
          case "hex":
            return {
              output: textToHex(input, " "),
              error: null,
              note: L.utf8Bytes,
            };
          case "backslash-x":
            return { output: escapes.x, error: null, note: L.utf8Bytes };
          case "unicode":
            return { output: escapes.u, error: null, note: L.codePoints };
          case "binary":
            return { output: escapes.b, error: null, note: L.utf8Bytes };
          case "html":
            return {
              output: charTable(input)
                .map((row) => row.html)
                .join(""),
              error: null,
              note: L.codePoints,
            };
        }
      }}
    />
  );
}
