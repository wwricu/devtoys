"use client";

import { Segmented, indentOptions, useStoredState, type Indent } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { formatSql, type KeywordCase } from "./format";

const caseOptions: { value: KeywordCase; label: string }[] = [
  { value: "upper", label: "UPPER" },
  { value: "lower", label: "lower" },
  { value: "preserve", label: "Keep" },
];

export default function SqlFormatter() {
  const [keywordCase, setKeywordCase] = useStoredState<KeywordCase>("sql.case", "upper");
  const [indent, setIndent] = useStoredState<Indent>("sql.indent", "2");

  return (
    <SimpleTransform
      controls={
        <>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Keywords</span>
          <Segmented
            ariaLabel="Keyword case"
            value={keywordCase}
            options={caseOptions}
            onChange={setKeywordCase}
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Indent</span>
          <Segmented
            ariaLabel="Indentation"
            value={indent}
            options={indentOptions}
            onChange={setIndent}
          />
        </>
      }
      run={(input) => {
        if (input.trim() === "") return { output: "", error: null };
        const minify = indent === "none";
        const unit =
          indent === "tab" ? "\t" : minify ? "" : " ".repeat(Number(indent));
        const { output, error } = formatSql(input, { keywordCase, indent: unit, minify });
        return {
          output,
          error,
          note: error ? undefined : minify ? "minified" : "formatted",
        };
      }}
      inputPlaceholder="select a, b from t where a > 1 order by b desc"
    />
  );
}
