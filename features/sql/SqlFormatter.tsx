"use client";

import {
  Segmented,
  useIndentOptions,
  useStoredState,
  type Indent,
} from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { useText } from "@/lib/i18n";
import { sqlExtensions } from "./editor";
import { formatSql, type KeywordCase } from "./format";
import { strings } from "./locale";

export default function SqlFormatter() {
  const L = useText(strings);
  const indentOptions = useIndentOptions();
  const [keywordCase, setKeywordCase] = useStoredState<KeywordCase>(
    "sql.case",
    "upper",
  );
  const [indent, setIndent] = useStoredState<Indent>("sql.indent", "2");

  const caseOptions: { value: KeywordCase; label: string }[] = [
    { value: "upper", label: L.upper },
    { value: "lower", label: L.lower },
    { value: "preserve", label: L.keep },
  ];

  return (
    <SimpleTransform
      controls={
        <>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {L.keywords}
          </span>
          <Segmented
            ariaLabel={L.keywordCase}
            value={keywordCase}
            options={caseOptions}
            onChange={setKeywordCase}
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {L.indent}
          </span>
          <Segmented
            ariaLabel={L.indentation}
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
        const { output, error } = formatSql(input, {
          keywordCase,
          indent: unit,
          minify,
        });
        return {
          output,
          error,
          note: error ? undefined : minify ? L.minified : L.formatted,
        };
      }}
      inputPlaceholder="select a, b from t where a > 1 order by b desc"
      extensions={sqlExtensions}
    />
  );
}
