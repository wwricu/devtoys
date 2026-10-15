"use client";

import { SimpleTransform } from "@/components/transform";
import { useStoredState } from "@/components/kit";
import { applyLines, OPERATION_LABELS, type LineOperation } from "./format";

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
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function LineTools() {
  const [operation, setOperation] = useStoredState<LineOperation>("lines.operation", "sort-asc");
  const [ignoreCase, setIgnoreCase] = useStoredState("lines.ignoreCase", false);
  const [keepEmpty, setKeepEmpty] = useStoredState("lines.keepEmpty", false);
  const [separator, setSeparator] = useStoredState("lines.separator", " ");

  const controlClass =
    "rounded border border-neutral-300 bg-white px-1.5 py-1 text-xs text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

  return (
    <SimpleTransform
      controls={
        <>
          <select
            className={controlClass}
            aria-label="Operation"
            value={operation}
            onChange={(e) => setOperation(e.target.value as LineOperation)}
          >
            {OPERATION_LABELS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Check label="Ignore case" value={ignoreCase} onChange={setIgnoreCase} />
          <Check label="Keep empty lines" value={keepEmpty} onChange={setKeepEmpty} />
          {operation === "join-lines" && (
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              Separator
              <input
                className={controlClass + " w-24 font-mono"}
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                placeholder=" "
              />
            </label>
          )}
        </>
      }
      inputPlaceholder="One item per line…"
      run={(input) => {
        const { output, note } = applyLines(input, operation, {
          ignoreCase,
          keepEmpty,
          separator,
        });
        return { output, error: null, note };
      }}
    />
  );
}
