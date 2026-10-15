"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform, type TransformResult } from "@/components/transform";
import { jsonToYaml } from "./emit";
import { parseYaml } from "./parse";

type Direction = "json2yaml" | "yaml2json";

export default function YamlConverter() {
  const [direction, setDirection] = useStoredState<Direction>("yaml.direction", "json2yaml");
  const [indent, setIndent] = useStoredState<"2" | "4">("yaml.indent", "2");

  const run = (input: string): TransformResult => {
    if (input.trim() === "") return { output: "", error: null };
    const size = Number(indent);

    if (direction === "json2yaml") {
      try {
        return { output: jsonToYaml(JSON.parse(input), size), error: null };
      } catch (err) {
        return { output: "", error: err instanceof Error ? err.message : String(err) };
      }
    }

    const parsed = parseYaml(input);
    if (parsed.error) return { output: "", error: `Line ${parsed.line}: ${parsed.error}` };
    return { output: JSON.stringify(parsed.value, null, size), error: null };
  };

  return (
    <SimpleTransform
      run={run}
      inputPlaceholder={direction === "json2yaml" ? "Paste JSON…" : "Paste YAML…"}
      controls={
        <>
          <Segmented
            value={direction}
            options={[
              { value: "json2yaml", label: "JSON to YAML" },
              { value: "yaml2json", label: "YAML to JSON" },
            ]}
            onChange={setDirection}
            ariaLabel="Direction"
          />
          <Segmented
            value={indent}
            options={[
              { value: "2", label: "2 spaces" },
              { value: "4", label: "4 spaces" },
            ]}
            onChange={setIndent}
            ariaLabel="Indent"
          />
        </>
      }
    />
  );
}
