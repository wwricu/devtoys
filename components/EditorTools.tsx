"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";

/** Keys that move the caret; a read-only textarea ignores them natively. */
const NAV_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

const BAR_WIDTH = 288;

function matchesOf(text: string, query: string): number[] {
  if (query === "") return [];
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const out: number[] = [];
  let at = haystack.indexOf(needle);
  while (at !== -1 && out.length < 5000) {
    out.push(at);
    at = haystack.indexOf(needle, at + needle.length);
  }
  return out;
}

/** Scroll a textarea so the character at `index` sits near the upper third. */
function scrollToIndex(area: HTMLTextAreaElement, index: number) {
  const style = getComputedStyle(area);
  const mirror = document.createElement("div");
  mirror.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    "visibility:hidden",
    "white-space:pre-wrap",
    "overflow-wrap:break-word",
    "word-break:break-word",
    "box-sizing:border-box",
    `width:${area.clientWidth}px`,
    `padding:${style.padding}`,
    `font-family:${style.fontFamily}`,
    `font-size:${style.fontSize}`,
    `font-weight:${style.fontWeight}`,
    `line-height:${style.lineHeight}`,
    `letter-spacing:${style.letterSpacing}`,
    `tab-size:${style.tabSize}`,
  ].join(";");
  mirror.textContent = area.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = "x";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  mirror.remove();
  area.scrollTop = Math.max(0, top - area.clientHeight / 3);
}

function FindIcon({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
      <path
        d={up ? "M2.5 7.5 6 4l3.5 3.5" : "M2.5 4.5 6 8l3.5-3.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Code-editor habits for the plain textareas:
 * - Ctrl+F opens an in-editor find bar instead of the page find.
 * - Read-only panes accept a caret and keyboard navigation. Chrome ignores
 *   arrow keys in read-only textareas, so the attribute is lifted for the
 *   duration of the key press only.
 */
export default function EditorTools() {
  const { t } = useLang();
  const pathname = usePathname();
  const [target, setTarget] = useState<HTMLTextAreaElement | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  /** The page the editor belongs to; a route change hides the bar. */
  const [openPath, setOpenPath] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const place = useCallback((area: HTMLTextAreaElement) => {
    const rect = area.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - BAR_WIDTH - 8);
    setPos({
      left: Math.min(Math.max(8, rect.right - BAR_WIDTH - 8), maxLeft),
      top: Math.max(8, rect.top + 8),
    });
  }, []);

  const close = useCallback(() => {
    setTarget(null);
    setPos(null);
    setMatches([]);
    setIndex(0);
  }, []);

  const open = useCallback(
    (area: HTMLTextAreaElement) => {
      const found = matchesOf(area.value, query);
      const at = found.findIndex((p) => p >= area.selectionStart);
      setTarget(area);
      setOpenPath(pathname);
      setMatches(found);
      setIndex(at === -1 ? 0 : at);
      place(area);
    },
    [pathname, place, query],
  );

  const jump = useCallback(
    (next: number) => {
      if (!target || matches.length === 0) return;
      const i = ((next % matches.length) + matches.length) % matches.length;
      setIndex(i);
      const start = matches[i];
      target.focus();
      target.setSelectionRange(start, start + query.length);
      scrollToIndex(target, start);
    },
    [target, matches, query],
  );

  const retarget = useCallback(
    (value: string) => {
      setQuery(value);
      if (!target) return;
      const found = matchesOf(target.value, value);
      const at = found.findIndex((p) => p >= target.selectionStart);
      setMatches(found);
      setIndex(at === -1 ? 0 : at);
    },
    [target],
  );

  useEffect(() => {
    if (!target) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [target]);

  // Keep the bar glued to the editor across resizes and scrolling pages.
  useEffect(() => {
    if (!target) return;
    const sync = () => place(target);
    const observer = new ResizeObserver(sync);
    observer.observe(target);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [target, place]);

  // Follow live edits while the bar is open.
  useEffect(() => {
    if (!target) return;
    const onInput = () => {
      const found = matchesOf(target.value, query);
      setMatches(found);
      setIndex((current) => Math.min(current, Math.max(0, found.length - 1)));
    };
    target.addEventListener("input", onInput);
    return () => target.removeEventListener("input", onInput);
  }, [target, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement;

      if (
        event.target instanceof HTMLTextAreaElement &&
        event.target.readOnly &&
        NAV_KEYS.has(event.key)
      ) {
        const area = event.target;
        area.readOnly = false;
        setTimeout(() => {
          area.readOnly = true;
        }, 0);
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "f"
      ) {
        if (target && active === inputRef.current) {
          event.preventDefault();
          inputRef.current?.select();
          return;
        }
        if (target && active === target) {
          event.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
          return;
        }
        if (active instanceof HTMLTextAreaElement && active.closest("main")) {
          event.preventDefault();
          open(active);
        }
        return;
      }

      if (!target || openPath !== pathname) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        target.focus();
        return;
      }

      if (event.key === "Enter" && active === inputRef.current) {
        event.preventDefault();
        jump(index);
        return;
      }

      if (event.key === "Enter" && active === target) {
        event.preventDefault();
        jump(index + (event.shiftKey ? -1 : 1));
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [target, index, jump, open, close, openPath, pathname]);

  if (!target || !pos || openPath !== pathname) return null;

  return (
    <div
      role="search"
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-30 flex w-72 items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => retarget(e.target.value)}
        placeholder={t.findInEditor}
        aria-label={t.findInEditor}
        className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-neutral-400"
      />
      <span
        className={`w-10 shrink-0 text-right text-[11px] tabular-nums ${
          matches.length > 0
            ? "text-neutral-400"
            : "text-red-500 dark:text-red-400"
        }`}
      >
        {matches.length > 0 ? `${index + 1}/${matches.length}` : "0/0"}
      </span>
      <button
        type="button"
        onClick={() => jump(index - 1)}
        title={t.findPrevious}
        aria-label={t.findPrevious}
        className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      >
        <FindIcon up />
      </button>
      <button
        type="button"
        onClick={() => jump(index + 1)}
        title={t.findNext}
        aria-label={t.findNext}
        className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      >
        <FindIcon up={false} />
      </button>
      <button
        type="button"
        onClick={() => {
          close();
          target.focus();
        }}
        title={t.findClose}
        aria-label={t.findClose}
        className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      >
        <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
          <path
            d="m3 3 6 6M9 3l-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
