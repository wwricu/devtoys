"use client";

import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
      className="whitespace-nowrap rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
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
  const { t } = useLang();
  const pane = useContext(PaneControlsContext);
  return (
    <section
      className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${className ?? ""}`}
    >
      <header className="flex min-h-8 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-2 py-0.5 dark:border-neutral-800 dark:bg-neutral-800/60">
        {/* A narrow pane truncates the title instead of squeezing the buttons. */}
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </span>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          {actions}
        </div>
        {pane && (
          <button
            type="button"
            onClick={pane.collapse}
            title={t.hidePane}
            aria-label={t.hidePane}
            // Each pane hides toward its own outer edge; stacked panes keep the
            // button trailing like every other collapse control.
            className={`shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 ${
              pane.edge === "start" && pane.orientation === "row"
                ? "md:order-first"
                : ""
            }`}
          >
            <PaneChevron edge={pane.edge} orientation={pane.orientation} />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

const editorBase =
  "w-full bg-transparent p-2 font-mono text-xs leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200";
/** Fills its panel via flex layout. */
export const editorClass = `${editorBase} min-h-0 flex-1 resize-none`;

/** For editors in scrollable pages: content-sized with browser native resize. */
export const flowEditorClass = `${editorBase} flex-none min-h-24 resize rounded border border-neutral-200 dark:border-neutral-800`;

/** Smallest share any one pane may take, as a fraction of the whole group. */
const MIN_SHARE = 0.15;
const KEY_STEP = 0.05;

type PaneEdge = "start" | "end";
type SplitOrientation = "row" | "column";

type PaneControls = {
  /** Which edge the pane collapses toward, so its header button points there. */
  edge: PaneEdge;
  orientation: SplitOrientation;
  collapse: () => void;
};

/** Null outside a split group, which hides the header buttons. */
const PaneControlsContext = createContext<PaneControls | null>(null);

function PaneChevron({
  edge,
  orientation,
}: {
  edge: PaneEdge;
  orientation: SplitOrientation;
}) {
  // A row group only turns sideways on md+; below that its panes stack, so the
  // chevron turns with them.
  const turn =
    orientation === "column"
      ? edge === "start"
        ? "rotate-90"
        : "-rotate-90"
      : edge === "start"
        ? "rotate-90 md:rotate-0"
        : "-rotate-90 md:rotate-180";
  return (
    <svg
      viewBox="0 0 16 16"
      className={`size-3.5 ${turn}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m10 3-5 5 5 5" />
    </svg>
  );
}

/** The sliver that replaces a collapsed pane; clicking it brings the pane back. */
function RestorePane({
  edge,
  orientation,
  onRestore,
}: {
  edge: PaneEdge;
  orientation: SplitOrientation;
  onRestore: () => void;
}) {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={onRestore}
      title={t.showPane}
      aria-label={t.showPane}
      className={`flex h-6 w-full shrink-0 items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 ${
        orientation === "row" ? "md:h-full md:w-6" : ""
      }`}
    >
      <PaneChevron edge={edge} orientation={orientation} />
    </button>
  );
}

/**
 * Panes across draggable gutters. The group keeps the size the page gave it; a
 * drag only moves one boundary, trading space between its two neighbours. One
 * site-wide ratio per pane count and axis, so a user sets it once and every
 * tool with that many panes follows.
 */
export function Split({
  children,
  orientation = "row",
}: {
  children: React.ReactNode;
  /** "column" stacks panes top/bottom on desktop as well as on mobile. */
  orientation?: SplitOrientation;
}) {
  const { t } = useLang();
  // A branch may return its panes as one fragment; flatten it so each pane is
  // still a resizable sibling.
  const panes = Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: React.ReactNode }>(child) &&
    child.type === Fragment
      ? Children.toArray(child.props.children)
      : [child],
  );
  const count = panes.length;
  const [stored, setStored] = useStoredState<number[]>(
    orientation === "column"
      ? `split.shares.column.${count}`
      : `split.shares.${count}`,
    [],
  );
  const box = useRef<HTMLDivElement>(null);
  const values =
    stored.length === count ? stored : panes.map(() => 1 / count);
  // Hiding a pane is a momentary zoom, not a preference: it stays in memory so
  // a tool always opens with every pane.
  const [collapsed, setCollapsed] = useState<number | null>(null);
  const edgeOf = (index: number): PaneEdge =>
    index === 0
      ? "start"
      : index === count - 1
        ? "end"
        : index < count / 2
          ? "start"
          : "end";
  const share = (index: number) => {
    if (collapsed === null) return `${values[index]} 1 0%`;
    // The panes still visible keep their stored proportions of the room left.
    const visible = values.reduce(
      (sum, value, i) => (i === collapsed ? sum : sum + value),
      0,
    );
    return `${values[index] / visible} 1 0%`;
  };

  const onPointerDown = (index: number) => (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const el = box.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const column = getComputedStyle(el).flexDirection === "column";
    const span = column ? rect.height : rect.width;
    const origin = column ? event.clientY : event.clientX;
    const start = values[index];
    const pair = values[index] + values[index + 1];
    event.preventDefault();
    const move = (e: PointerEvent) => {
      const delta = ((column ? e.clientY : e.clientX) - origin) / span;
      const next = [...values];
      next[index] = Math.min(pair - MIN_SHARE, Math.max(MIN_SHARE, start + delta));
      next[index + 1] = pair - next[index];
      setStored(next);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const onKeyDown = (index: number) => (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    if (!back && !forward) return;
    const pair = values[index] + values[index + 1];
    const value = values[index] + (back ? -KEY_STEP : KEY_STEP);
    if (value < MIN_SHARE || value > pair - MIN_SHARE) return;
    event.preventDefault();
    const next = [...values];
    next[index] = value;
    next[index + 1] = pair - value;
    setStored(next);
  };

  if (count < 2)
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">{children}</div>
    );

  return (
    <div
      ref={box}
      className={`flex min-h-0 flex-1 flex-col ${
        orientation === "row" ? "md:flex-row" : ""
      }`}
    >
      {panes.map((pane, i) => (
        <Fragment key={i}>
          {collapsed === i ? (
            <RestorePane
              edge={edgeOf(i)}
              orientation={orientation}
              onRestore={() => setCollapsed(null)}
            />
          ) : (
            <div
              className="flex min-h-0 min-w-0 flex-col"
              style={{ flex: share(i) }}
            >
              <PaneControlsContext.Provider
                value={
                  collapsed === null
                    ? {
                        edge: edgeOf(i),
                        orientation,
                        collapse: () => setCollapsed(i),
                      }
                    : null
                }
              >
                {pane}
              </PaneControlsContext.Provider>
            </div>
          )}
          {i < count - 1 && collapsed === null && (
            <div
              role="separator"
              aria-orientation={orientation === "column" ? "horizontal" : "vertical"}
              aria-label={t.resizePanes}
              aria-valuenow={Math.round(values[i] * 100)}
              aria-valuemin={15}
              aria-valuemax={85}
              tabIndex={0}
              onPointerDown={onPointerDown(i)}
              onKeyDown={onKeyDown(i)}
              className={`h-1 w-full shrink-0 cursor-row-resize touch-none rounded bg-neutral-200 hover:bg-neutral-300 focus-visible:bg-neutral-400 focus-visible:outline-none dark:bg-neutral-800 dark:hover:bg-neutral-700 ${
                orientation === "row" ? "md:h-full md:w-1 md:cursor-col-resize" : ""
              }`}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

export function StatusLine({
  error,
  info,
}: {
  error?: { message: string; line: number; column: number } | null;
  info: string;
}) {
  const { t } = useLang();
  // Like JWT Decoder: no hint, no bar. An empty bordered strip only costs space.
  if (!error && !info) return null;
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
