"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform, type TransformResult } from "@/components/transform";
import { csvToJson, jsonToCsv, type Delimiter } from "./format";

type Direction = "json2csv" | "csv2json";

const DELIMITERS: { value: Delimiter; label: string }[] = [
  { value: ",", label: "comma" },
  { value: ";", label: "semicolon" },
  { value: "\t", label: "tab" },
  { value: "|", label: "pipe" },
];

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
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function CsvConverter() {
  const [direction, setDirection] = useStoredState<Direction>("csv.direction", "json2csv");
  const [delimiter, setDelimiter] = useStoredState<Delimiter>("csv.delimiter", ",");
  const [flatten, setFlatten] = useStoredState("csv.flatten", false);
  const [header, setHeader] = useStoredState("csv.header", true);
  const [inferTypes, setInferTypes] = useStoredState("csv.infer", true);
  const [expandDots, setExpandDots] = useStoredState("csv.expand", false);

  const run = (input: string): TransformResult => {
    if (input.trim() === "") return { output: "", error: null };
    try {
      if (direction === "json2csv") {
        const value = JSON.parse(input);
        return { output: jsonToCsv(value, { delimiter, flatten }), error: null };
      }
      const value = csvToJson(input, { delimiter, header, inferTypes, expandDots });
      return { output: JSON.stringify(value, null, 2), error: null };
    } catch (err) {
      return { output: "", error: err instanceof Error ? err.message : String(err) };
    }
  };

  return (
    <SimpleTransform
      run={run}
      inputPlaceholder={direction === "json2csv" ? "Paste a JSON array…" : "Paste CSV text…"}
      controls={
        <>
          <Segmented
            value={direction}
            options={[
              { value: "json2csv", label: "JSON to CSV" },
              { value: "csv2json", label: "CSV to JSON" },
            ]}
            onChange={setDirection}
            ariaLabel="Direction"
          />
          <Segmented
            value={delimiter}
            options={DELIMITERS}
            onChange={setDelimiter}
            ariaLabel="Delimiter"
          />
          {direction === "json2csv" ? (
            <Toggle label="Flatten nested keys" value={flatten} onChange={setFlatten} />
          ) : (
            <>
              <Toggle label="First row is header" value={header} onChange={setHeader} />
              <Toggle label="Detect numbers and booleans" value={inferTypes} onChange={setInferTypes} />
              <Toggle label="Expand dotted keys" value={expandDots} onChange={setExpandDots} />
            </>
          )}
        </>
      }
    />
  );
}
