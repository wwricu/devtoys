"use client";

import { Segmented, ToolButton, useStoredState } from "@/components/kit";
import { SimpleTransform, type TransformResult } from "@/components/transform";
import { useText } from "@/lib/i18n";
import { base32Decode, base32Encode, type Base32Variant } from "./format";
import { strings } from "./locale";

type Direction = "encode" | "decode";

export default function Base32Tool() {
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "b32.direction",
    "encode",
  );
  const [variant, setVariant] = useStoredState<Base32Variant>(
    "b32.variant",
    "standard",
  );
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
      inputPlaceholder={direction === "encode" ? L.encodeHint : L.decodeHint}
      controls={
        <>
          <Segmented
            value={direction}
            options={[
              { value: "encode", label: L.encode },
              { value: "decode", label: L.decode },
            ]}
            onChange={setDirection}
            ariaLabel={L.direction}
          />
          <Segmented
            value={variant}
            options={[
              { value: "standard", label: L.rfc4648 },
              { value: "hex", label: L.base32Hex },
            ]}
            onChange={setVariant}
            ariaLabel={L.alphabet}
          />
          <ToolButton
            onClick={() => setPadding(!padding)}
            title={L.paddingHint}
          >
            {L.padding}: {padding ? L.paddingOn : L.paddingOff}
          </ToolButton>
        </>
      }
    />
  );
}
