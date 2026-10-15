"use client";

import { useCallback, useState } from "react";
import { CopyButton, StatusLine } from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import { parseBase, toBase } from "./format";
import { strings } from "./locale";

const inputClass =
  "w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

export default function NumberBase() {
  const L = useText(strings);
  const [value, setValue] = useState<bigint | null>(0n);
  const [text, setText] = useState<Record<number, string>>({
    10: "0",
    16: "0",
    8: "0",
    2: "0",
  });
  const [error, setError] = useState<string | null>(null);

  const fields = [
    { base: 10, label: L.decimal },
    { base: 16, label: L.hexadecimal },
    { base: 8, label: L.octal },
    { base: 2, label: L.binary },
  ];

  const onEdit = useCallback(
    (base: number, raw: string) => {
      setText((prev) => ({ ...prev, [base]: raw }));
      if (raw.trim() === "") {
        setValue(null);
        setError(null);
        return;
      }
      const parsed = parseBase(raw, base);
      if (parsed === null) {
        setError(fill(L.invalidDigits, { base }));
        return;
      }
      setValue(parsed);
      setError(null);
      setText({
        10: toBase(parsed, 10),
        16: toBase(parsed, 16),
        8: toBase(parsed, 8),
        2: toBase(parsed, 2),
      });
    },
    [L],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{L.hint}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.base} className="flex flex-col gap-1">
            <span className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              {fill(L.fieldLabel, { name: f.label, base: f.base })}
              <CopyButton getText={() => text[f.base] ?? ""} />
            </span>
            <input
              className={inputClass}
              spellCheck={false}
              value={text[f.base] ?? ""}
              onChange={(e) => onEdit(f.base, e.target.value)}
            />
          </label>
        ))}
      </div>
      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          value !== null
            ? fill(L.decimalInfo, { value: toBase(value, 10) })
            : L.enterNumber
        }
      />
    </div>
  );
}
