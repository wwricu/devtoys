"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/kit";
import { BYTE_UNITS, convertBytes } from "./format";

const inputClass =
  "w-40 rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

export default function ByteConverter() {
  const [value, setValue] = useState("1");
  const [unit, setUnit] = useState("MB");

  const result = useMemo(() => {
    const n = Number(value);
    if (value.trim() === "" || Number.isNaN(n)) return null;
    return convertBytes(n, unit);
  }, [value, unit]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={inputClass}
          value={value}
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
        />
        <select
          className={inputClass + " w-24"}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          {BYTE_UNITS.map((u) => (
            <option key={u.symbol} value={u.symbol}>
              {u.symbol}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-500">
          = {result ? result.bytes.toLocaleString("en-US") : "—"} bytes
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {result?.rows.map((r) => (
          <div
            key={r.symbol}
            className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1 dark:border-neutral-800"
          >
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {r.symbol}
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 truncate rounded px-1 text-right font-mono text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Click to copy"
              onClick={() => navigator.clipboard?.writeText(r.value)}
            >
              {r.value}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
