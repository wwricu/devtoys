"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { parseToml, stringifyToml } from "./format";

type Direction = "toml" | "json";

const directionOptions: { value: Direction; label: string }[] = [
  { value: "toml", label: "TOML to JSON" },
  { value: "json", label: "JSON to TOML" },
];

export default function TomlConverter() {
  const [direction, setDirection] = useStoredState<Direction>("toml.direction", "toml");

  return (
    <SimpleTransform
      controls={
        <Segmented
          value={direction}
          options={directionOptions}
          onChange={setDirection}
          ariaLabel="Direction"
        />
      }
      run={(input) => {
        if (input.trim() === "") return { output: "", error: null };
        if (direction === "toml") {
          const { value, error } = parseToml(input);
          if (!value) return { output: "", error: error ?? "Could not read the TOML text" };
          return { output: JSON.stringify(value, null, 2), error: null };
        }
        try {
          return { output: stringifyToml(JSON.parse(input) as unknown), error: null };
        } catch (err) {
          return { output: "", error: err instanceof Error ? err.message : String(err) };
        }
      }}
      inputPlaceholder={
        direction === "toml"
          ? "[package]\nname = \"example\"\nkeywords = [\"a\", \"b\"]"
          : '{\n  "package": { "name": "example" }\n}'
      }
    />
  );
}
