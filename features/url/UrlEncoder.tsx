"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { useText } from "@/lib/i18n";
import { decodeUrl, encodeUrl, type UrlScope } from "./format";
import { strings } from "./locale";

type Mode = "encode" | "decode";

export default function UrlEncoder() {
  const L = useText(strings);
  const [mode, setMode] = useStoredState<Mode>("url.mode", "encode");
  const [scope, setScope] = useStoredState<UrlScope>("url.scope", "component");

  const modeOptions: { value: Mode; label: string }[] = [
    { value: "encode", label: L.encode },
    { value: "decode", label: L.decode },
  ];

  const scopeOptions: { value: UrlScope; label: string }[] = [
    { value: "component", label: L.component },
    { value: "uri", label: L.fullUrl },
    { value: "form", label: L.form },
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
          <Segmented
            ariaLabel={L.scope}
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
          return { output: "", error: L.invalidInput };
        }
      }}
    />
  );
}
