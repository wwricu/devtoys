"use client";

import { SimpleTransform } from "@/components/transform";
import { Segmented, useStoredState } from "@/components/kit";
import { charTable, hexToText, textToHex, toEscapes } from "./format";

type Direction = "toHex" | "fromHex";
type Form = "hex" | "backslash-x" | "unicode" | "binary" | "html";

const directionOptions: { value: Direction; label: string }[] = [
  { value: "toHex", label: "Text to bytes" },
  { value: "fromHex", label: "Bytes to text" },
];

const formOptions: { value: Form; label: string }[] = [
  { value: "hex", label: "Hex" },
  { value: "backslash-x", label: "\\x" },
  { value: "unicode", label: "\\u" },
  { value: "binary", label: "Binary" },
  { value: "html", label: "&#dec;" },
];

export default function Base16Tool() {
  const [direction, setDirection] = useStoredState<Direction>("b16.direction", "toHex");
  const [form, setForm] = useStoredState<Form>("b16.form", "hex");

  return (
    <SimpleTransform
      controls={
        <>
          <Segmented value={direction} options={directionOptions} onChange={setDirection} ariaLabel="Direction" />
          {direction === "toHex" && (
            <Segmented value={form} options={formOptions} onChange={setForm} ariaLabel="Notation" />
          )}
        </>
      }
      inputPlaceholder={
        direction === "toHex" ? "Text to convert…" : "Hex bytes, e.g. 48 65 6c 6c 6f"
      }
      run={(input) => {
        if (direction === "fromHex") {
          try {
            return { output: hexToText(input), error: null };
          } catch (err) {
            return { output: "", error: err instanceof Error ? err.message : String(err) };
          }
        }
        if (input === "") return { output: "", error: null };
        const escapes = toEscapes(input);
        switch (form) {
          case "hex":
            return { output: textToHex(input, " "), error: null, note: "UTF-8 bytes" };
          case "backslash-x":
            return { output: escapes.x, error: null, note: "UTF-8 bytes" };
          case "unicode":
            return { output: escapes.u, error: null, note: "code points" };
          case "binary":
            return { output: escapes.b, error: null, note: "UTF-8 bytes" };
          case "html":
            return {
              output: charTable(input)
                .map((row) => row.html)
                .join(""),
              error: null,
              note: "code points",
            };
        }
      }}
    />
  );
}
