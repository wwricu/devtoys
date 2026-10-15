"use client";

import { useMemo, useState } from "react";
import { CopyButton, ToolButton, useStoredState } from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import {
  generatePassword,
  passwordEntropy,
  type PasswordOptions,
} from "./format";
import { strings } from "./locale";

type Strength = "weak" | "fair" | "strong" | "veryStrong";

function strength(bits: number): {
  level: Strength;
  pct: number;
  tone: string;
} {
  if (bits < 40) return { level: "weak", pct: 25, tone: "bg-red-500" };
  if (bits < 64) return { level: "fair", pct: 50, tone: "bg-amber-500" };
  if (bits < 100) return { level: "strong", pct: 75, tone: "bg-lime-500" };
  return { level: "veryStrong", pct: 100, tone: "bg-green-600" };
}

type ToggleKey = keyof PasswordOptions;

export default function PasswordGenerator() {
  const L = useText(strings);
  const [opts, setOpts] = useStoredState<PasswordOptions>("password.opts", {
    length: 20,
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
    requireEach: true,
  });
  const [draw, setDraw] = useState(0);

  // draw is a nonce: bumping it rolls a new password without changing options
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => generatePassword(opts), [opts, draw]);

  // Charset shorthand is language neutral; the wordy toggles come from locale.
  const toggles: { key: ToggleKey; label: string }[] = [
    { key: "lower", label: "a-z" },
    { key: "upper", label: "A-Z" },
    { key: "digits", label: "0-9" },
    { key: "symbols", label: "!@#" },
    { key: "excludeAmbiguous", label: L.noAmbiguous },
    { key: "requireEach", label: L.requireEach },
  ];

  const bits = passwordEntropy(opts);
  const s = strength(bits);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 break-all rounded border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm dark:border-neutral-800 dark:bg-neutral-900">
          {value || "—"}
        </span>
        <ToolButton
          onClick={() => setDraw((d) => d + 1)}
          title={L.regenerateHint}
        >
          {L.regenerate}
        </ToolButton>
        <CopyButton getText={() => value} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{L[s.level]}</span>
          <span>{fill(L.entropy, { bits })}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
          <div className={`h-full ${s.tone}`} style={{ width: `${s.pct}%` }} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        {L.length}
        <input
          type="range"
          min={1}
          max={128}
          value={opts.length}
          onChange={(e) => setOpts({ ...opts, length: Number(e.target.value) })}
          className="flex-1 accent-neutral-700 dark:accent-neutral-300"
        />
        <span className="w-8 text-right font-mono">{opts.length}</span>
      </label>

      <div className="flex flex-wrap gap-2">
        {toggles.map((toggle) => (
          <label
            key={toggle.key}
            className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300"
          >
            <input
              type="checkbox"
              checked={Boolean(opts[toggle.key])}
              onChange={(e) =>
                setOpts({ ...opts, [toggle.key]: e.target.checked })
              }
              className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
            />
            {toggle.label}
          </label>
        ))}
      </div>
    </div>
  );
}
