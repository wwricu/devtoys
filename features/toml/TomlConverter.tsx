"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { useText } from "@/lib/i18n";
import { parseToml, stringifyToml } from "./format";
import { strings } from "./locale";

type Direction = "toml" | "json";

export default function TomlConverter() {
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "toml.direction",
    "toml",
  );

  const directionOptions: { value: Direction; label: string }[] = [
    { value: "toml", label: L.tomlToJson },
    { value: "json", label: L.jsonToToml },
  ];

  return (
    <SimpleTransform
      controls={
        <Segmented
          value={direction}
          options={directionOptions}
          onChange={setDirection}
          ariaLabel={L.direction}
        />
      }
      run={(input) => {
        if (input.trim() === "") return { output: "", error: null };
        if (direction === "toml") {
          const { value, error } = parseToml(input);
          if (!value) return { output: "", error: error ?? L.readError };
          return { output: JSON.stringify(value, null, 2), error: null };
        }
        try {
          return {
            output: stringifyToml(JSON.parse(input) as unknown),
            error: null,
          };
        } catch (err) {
          return {
            output: "",
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }}
      inputPlaceholder={
        direction === "toml"
          ? '[package]\nname = "example"\nkeywords = ["a", "b"]'
          : '{\n  "package": { "name": "example" }\n}'
      }
    />
  );
}
