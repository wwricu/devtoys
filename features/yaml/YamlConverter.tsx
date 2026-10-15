"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform, type TransformResult } from "@/components/transform";
import { fill, useLang, useText } from "@/lib/i18n";
import { jsonToYaml } from "./emit";
import { parseYaml } from "./parse";
import { strings } from "./locale";

type Direction = "json2yaml" | "yaml2json";

export default function YamlConverter() {
  const { t } = useLang();
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "yaml.direction",
    "json2yaml",
  );
  const [indent, setIndent] = useStoredState<"2" | "4">("yaml.indent", "2");

  const run = (input: string): TransformResult => {
    if (input.trim() === "") return { output: "", error: null };
    const size = Number(indent);

    if (direction === "json2yaml") {
      try {
        return { output: jsonToYaml(JSON.parse(input), size), error: null };
      } catch (err) {
        return {
          output: "",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const parsed = parseYaml(input);
    if (parsed.error)
      return {
        output: "",
        error: fill(L.lineError, { line: parsed.line, message: parsed.error }),
      };
    return { output: JSON.stringify(parsed.value, null, size), error: null };
  };

  return (
    <SimpleTransform
      run={run}
      inputPlaceholder={direction === "json2yaml" ? L.jsonHint : L.yamlHint}
      controls={
        <>
          <Segmented
            value={direction}
            options={[
              { value: "json2yaml", label: L.jsonToYaml },
              { value: "yaml2json", label: L.yamlToJson },
            ]}
            onChange={setDirection}
            ariaLabel={L.direction}
          />
          <Segmented
            value={indent}
            options={[
              { value: "2", label: t.indent2 },
              { value: "4", label: t.indent4 },
            ]}
            onChange={setIndent}
            ariaLabel={L.indentation}
          />
        </>
      }
    />
  );
}
