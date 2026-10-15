"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { decodeUrl, encodeUrl, type UrlScope } from "./format";

type Mode = "encode" | "decode";

const modeOptions: { value: Mode; label: string }[] = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
];

const scopeOptions: { value: UrlScope; label: string }[] = [
  { value: "component", label: "Component" },
  { value: "uri", label: "Full URL" },
  { value: "form", label: "Form" },
];

export default function UrlEncoder() {
  const [mode, setMode] = useStoredState<Mode>("url.mode", "encode");
  const [scope, setScope] = useStoredState<UrlScope>("url.scope", "component");

  return (
    <SimpleTransform
      inputPlaceholder={
        mode === "encode" ? "Text or URL to encode…" : "Encoded text to decode…"
      }
      controls={
        <>
          <Segmented
            ariaLabel="Mode"
            value={mode}
            options={modeOptions}
            onChange={setMode}
          />
          <Segmented
            ariaLabel="Scope"
            value={scope}
            options={scopeOptions}
            onChange={setScope}
          />
        </>
      }
      run={(input) => {
        if (input === "") return { output: "", error: null };
        try {
          return {
            output:
              mode === "encode"
                ? encodeUrl(input, scope)
                : decodeUrl(input, scope),
            error: null,
          };
        } catch {
          return { output: "", error: "Invalid percent-encoded input" };
        }
      }}
    />
  );
}
