"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fill, useLang } from "@/lib/i18n";

/** Persist tool options (localStorage); each tool uses its own key */
export function useStoredState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const fallback = useRef(initial);

  useEffect(() => {
    let stored = fallback.current;
    try {
      const raw = localStorage.getItem(`tool:${key}`);
      if (raw !== null) stored = JSON.parse(raw);
    } catch {
      /* ignore corrupted storage */
    }
    // Set after the value is known so the persist pass never overwrites it.
    setState(stored);
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(`tool:${key}`, JSON.stringify(state));
    } catch {
      /* silently ignore when storage is unavailable */
    }
  }, [ready, key, state]);

  return [state, setState] as const;
}

export type Indent = "tab" | "2" | "4" | "none";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded border border-neutral-300 text-xs dark:border-neutral-700"
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 ${i > 0 ? "border-l border-neutral-300 dark:border-neutral-700" : ""} ${
            value === o.value
              ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
              : "bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Localized indent choices; the labels follow the UI language */
export function useIndentOptions(): { value: Indent; label: string }[] {
  const { t } = useLang();
  return [
    { value: "tab", label: t.indentTab },
    { value: "2", label: t.indent2 },
    { value: "4", label: t.indent4 },
    { value: "none", label: t.indentMinify },
  ];
}

export function ToolButton({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
    >
      {children}
    </button>
  );
}

export function CopyButton({ getText }: { getText: () => string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    const text = getText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore when clipboard is unavailable */
    }
  }, [getText]);

  return (
    <ToolButton onClick={onCopy} title={t.copyHint}>
      {copied ? t.copied : t.copy}
    </ToolButton>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${className ?? ""}`}
    >
      <header className="flex h-8 shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-50 px-2 dark:border-neutral-800 dark:bg-neutral-800/60">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </span>
        <div className="flex items-center gap-1.5">{actions}</div>
      </header>
      {children}
    </section>
  );
}

export const editorClass =
  "min-h-0 flex-1 w-full resize-none bg-transparent p-2 font-mono text-xs leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200";

export function StatusLine({
  error,
  info,
}: {
  error?: { message: string; line: number; column: number } | null;
  info: string;
}) {
  const { t } = useLang();
  return (
    <div
      className={`flex h-7 shrink-0 items-center gap-3 rounded border px-2 text-xs ${
        error
          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
      }`}
    >
      {error ? (
        <span>
          {fill(t.lineCol, { line: error.line, col: error.column })}:{" "}
          {error.message}
        </span>
      ) : (
        <span>{info}</span>
      )}
    </div>
  );
}
