"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform, type TransformResult } from "@/components/transform";
import { useText } from "@/lib/i18n";
import { csvToJson, jsonToCsv, type Delimiter } from "./format";
import { strings } from "./locale";

type Direction = "json2csv" | "csv2json";

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export default function CsvConverter() {
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "csv.direction",
    "json2csv",
  );
  const [delimiter, setDelimiter] = useStoredState<Delimiter>(
    "csv.delimiter",
    ",",
  );
  const [flatten, setFlatten] = useStoredState("csv.flatten", false);
  const [header, setHeader] = useStoredState("csv.header", true);
  const [inferTypes, setInferTypes] = useStoredState("csv.infer", true);
  const [expandDots, setExpandDots] = useStoredState("csv.expand", false);

  const DELIMITERS: { value: Delimiter; label: string }[] = [
    { value: ",", label: L.comma },
    { value: ";", label: L.semicolon },
    { value: "\t", label: L.tab },
    { value: "|", label: L.pipe },
  ];

  const run = (input: string): TransformResult => {
    if (input.trim() === "") return { output: "", error: null };
    try {
      if (direction === "json2csv") {
        const value = JSON.parse(input);
        return {
          output: jsonToCsv(value, { delimiter, flatten }),
          error: null,
        };
      }
      const value = csvToJson(input, {
        delimiter,
        header,
        inferTypes,
        expandDots,
      });
      return { output: JSON.stringify(value, null, 2), error: null };
    } catch (err) {
      return {
        output: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };

  return (
    <SimpleTransform
      run={run}
      inputPlaceholder={direction === "json2csv" ? L.jsonHint : L.csvHint}
      controls={
        <>
          <Segmented
            value={direction}
            options={[
              { value: "json2csv", label: L.jsonToCsv },
              { value: "csv2json", label: L.csvToJson },
            ]}
            onChange={setDirection}
            ariaLabel={L.direction}
          />
          <Segmented
            value={delimiter}
            options={DELIMITERS}
            onChange={setDelimiter}
            ariaLabel={L.delimiter}
          />
          {direction === "json2csv" ? (
            <Toggle label={L.flatten} value={flatten} onChange={setFlatten} />
          ) : (
            <>
              <Toggle label={L.header} value={header} onChange={setHeader} />
              <Toggle
                label={L.infer}
                value={inferTypes}
                onChange={setInferTypes}
              />
              <Toggle
                label={L.expandDots}
                value={expandDots}
                onChange={setExpandDots}
              />
            </>
          )}
        </>
      }
    />
  );
}
