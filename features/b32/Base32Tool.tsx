"use client";

import { Segmented, ToolButton, useStoredState } from "@/components/kit";
import { SimpleTransform, type TransformResult } from "@/components/transform";
import { base32Decode, base32Encode, type Base32Variant } from "./format";

type Direction = "encode" | "decode";

export default function Base32Tool() {
  const [direction, setDirection] = useStoredState<Direction>("b32.direction", "encode");
  const [variant, setVariant] = useStoredState<Base32Variant>("b32.variant", "standard");
  const [padding, setPadding] = useStoredState("b32.padding", true);

  const run = (input: string): TransformResult => {
    if (input === "") return { output: "", error: null };
    if (direction === "encode")
      return { output: base32Encode(input, variant, padding), error: null };
    return base32Decode(input, variant);
  };

  return (
    <SimpleTransform
      run={run}
      inputPlaceholder={direction === "encode" ? "Text to encode…" : "Base32 text to decode…"}
      controls={
        <>
          <Segmented
            value={direction}
            options={[
              { value: "encode", label: "Encode" },
              { value: "decode", label: "Decode" },
            ]}
            onChange={setDirection}
            ariaLabel="Direction"
          />
          <Segmented
            value={variant}
            options={[
              { value: "standard", label: "RFC 4648" },
              { value: "hex", label: "Base32Hex" },
            ]}
            onChange={setVariant}
            ariaLabel="Alphabet"
          />
          <ToolButton
            onClick={() => setPadding(!padding)}
            title="Toggle the trailing equals padding"
          >
            Padding: {padding ? "on" : "off"}
          </ToolButton>
        </>
      }
    />
  );
}
