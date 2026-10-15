"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyButton, ToolButton, useStoredState } from "@/components/kit";
import { generatePassword, passwordEntropy, type PasswordOptions } from "./format";

function strength(bits: number): { label: string; pct: number; tone: string } {
  if (bits < 40) return { label: "Weak", pct: 25, tone: "bg-red-500" };
  if (bits < 64) return { label: "Fair", pct: 50, tone: "bg-amber-500" };
  if (bits < 100) return { label: "Strong", pct: 75, tone: "bg-lime-500" };
  return { label: "Very strong", pct: 100, tone: "bg-green-600" };
}

const toggles: { key: keyof PasswordOptions; label: string }[] = [
  { key: "lower", label: "a-z" },
  { key: "upper", label: "A-Z" },
  { key: "digits", label: "0-9" },
  { key: "symbols", label: "!@#" },
  { key: "excludeAmbiguous", label: "No ambiguous" },
  { key: "requireEach", label: "Require each" },
];

export default function PasswordGenerator() {
  const [opts, setOpts] = useStoredState<PasswordOptions>("password.opts", {
    length: 20,
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
    requireEach: true,
  });
  const [value, setValue] = useState("");

  const regen = useCallback(() => setValue(generatePassword(opts)), [opts]);
  useEffect(() => {
    regen();
  }, [regen]);

  const bits = passwordEntropy(opts);
  const s = strength(bits);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 break-all rounded border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm dark:border-neutral-800 dark:bg-neutral-900">
          {value || "—"}
        </span>
        <ToolButton onClick={regen} title="Generate a new password">
          Regenerate
        </ToolButton>
        <CopyButton getText={() => value} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{s.label}</span>
          <span>~{bits} bits entropy</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
          <div className={`h-full ${s.tone}`} style={{ width: `${s.pct}%` }} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        Length
        <input
          type="range"
          min={1}
          max={128}
          value={opts.length}
          onChange={(e) =>
            setOpts({ ...opts, length: Number(e.target.value) })
          }
          className="flex-1 accent-neutral-700 dark:accent-neutral-300"
        />
        <span className="w-8 text-right font-mono">{opts.length}</span>
      </label>

      <div className="flex flex-wrap gap-2">
        {toggles.map((t) => (
          <label
            key={t.key}
            className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300"
          >
            <input
              type="checkbox"
              checked={Boolean(opts[t.key])}
              onChange={(e) =>
                setOpts({ ...opts, [t.key]: e.target.checked })
              }
              className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
            />
            {t.label}
          </label>
        ))}
      </div>
    </div>
  );
}
