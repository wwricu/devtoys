"use client";

import { SimpleTransform } from "@/components/transform";
import { useStoredState } from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import { applyLines, type LineOperation } from "./format";
import { strings } from "./locale";

function Check({
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

export default function LineTools() {
  const L = useText(strings);
  const [operation, setOperation] = useStoredState<LineOperation>(
    "lines.operation",
    "sort-asc",
  );
  const [ignoreCase, setIgnoreCase] = useStoredState("lines.ignoreCase", false);
  const [keepEmpty, setKeepEmpty] = useStoredState("lines.keepEmpty", false);
  const [separator, setSeparator] = useStoredState("lines.separator", " ");

  const operations: { value: LineOperation; label: string }[] = [
    { value: "sort-asc", label: L.sortAsc },
    { value: "sort-desc", label: L.sortDesc },
    { value: "sort-length", label: L.sortLength },
    { value: "sort-random", label: L.sortRandom },
    { value: "unique", label: L.unique },
    { value: "remove-empty", label: L.removeEmpty },
    { value: "trim-lines", label: L.trimLines },
    { value: "collapse-blank", label: L.collapseBlank },
    { value: "reverse", label: L.reverse },
    { value: "number", label: L.number },
    { value: "unnumber", label: L.unnumber },
    { value: "dedent", label: L.dedent },
    { value: "join-lines", label: L.joinLines },
  ];

  const controlClass =
    "rounded border border-neutral-300 bg-white px-1.5 py-1 text-xs text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

  return (
    <SimpleTransform
      controls={
        <>
          <select
            className={controlClass}
            aria-label={L.operation}
            value={operation}
            onChange={(e) => setOperation(e.target.value as LineOperation)}
          >
            {operations.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Check
            label={L.ignoreCase}
            value={ignoreCase}
            onChange={setIgnoreCase}
          />
          <Check
            label={L.keepEmpty}
            value={keepEmpty}
            onChange={setKeepEmpty}
          />
          {operation === "join-lines" && (
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              {L.separator}
              <input
                className={controlClass + " w-24 font-mono"}
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                placeholder={L.separatorHint}
              />
            </label>
          )}
        </>
      }
      inputPlaceholder={L.inputHint}
      run={(input) => {
        const { output, note } = applyLines(input, operation, {
          ignoreCase,
          keepEmpty,
          separator,
        });
        // The engine reports which remark applies and how many lines it touched.
        return {
          output,
          error: null,
          note: note
            ? fill(L[note.key], { count: note.count ?? 0 })
            : undefined,
        };
      }}
    />
  );
}
