"use client";

import { useEffect, useState } from "react";
import { useStoredState } from "./kit";
import { useLang } from "@/lib/i18n";
import { THEME_KEY, type Theme } from "@/lib/theme";

/**
 * Light/dark toggle. Nothing stored means "follow the system", which is what
 * the pre-paint script resolves on a first visit; clicking stores an explicit
 * choice that then wins over the system.
 */
export function ThemeToggle() {
  const { t } = useLang();
  const [mode, setMode] = useStoredState<Theme | null>(THEME_KEY, null);
  // Start from the class the head script already committed, so the icon and
  // the page agree on the very first frame.
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      setIsDark(mode === null ? media.matches : mode === "dark");
    apply();
    if (mode !== null) return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const label = isDark ? t.toLight : t.toDark;
  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? "light" : "dark")}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isDark ? (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        )}
      </svg>
    </button>
  );
}
