"use client";

import { getTool } from "@/lib/tools";
import { useFavourites } from "@/lib/favorites";
import { repoUrl, useLang } from "@/lib/i18n";

const iconClass =
  "flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white";

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true">
      <path d="M8 .5a.5.5 0 0 1 .47.33l1.95 5.25 5.58.37a.5.5 0 0 1 .28.87l-4.3 3.53 1.52 5.4a.5.5 0 0 1-.78.56L8 13.28l-4.72 3.53a.5.5 0 0 1-.78-.56l1.52-5.4-4.3-3.53a.5.5 0 0 1 .28-.87l5.58-.37L7.53.83A.5.5 0 0 1 8 .5Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M8 .5a.5.5 0 0 1 .47.33l1.95 5.25 5.58.37a.5.5 0 0 1 .28.87l-4.3 3.53 1.52 5.4a.5.5 0 0 1-.78.56L8 13.28l-4.72 3.53a.5.5 0 0 1-.78-.56l1.52-5.4-4.3-3.53a.5.5 0 0 1 .28-.87l5.58-.37L7.53.83A.5.5 0 0 1 8 .5Z" />
    </svg>
  );
}

function GlobeMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M1.5 8h13M8 1.5c3 3.6 3 9.4 0 13-3-3.6-3-9.4 0-13Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 fill-current">
      <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" />
    </svg>
  );
}

export default function ToolHeader({ id }: { id: string }) {
  const { toolName, toolDescription, lang, setLang, t } = useLang();
  const { has, toggle } = useFavourites();
  const tool = getTool(id);
  if (!tool) return null;

  const starred = has(id);
  const next = lang === "en" ? "zh" : "en";
  const nextLabel = lang === "en" ? t.chinese : t.english;

  return (
    <header className="flex shrink-0 items-start justify-between gap-2 pb-2">
      <div>
        <h1 className="text-sm font-semibold">{toolName(tool)}</h1>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {toolDescription(tool)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => toggle(id)}
          title={starred ? "Remove from favourites" : "Add to favourites"}
          aria-label={starred ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={starred}
          className={`shrink-0 rounded p-1 transition-colors ${
            starred
              ? "text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
              : "text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          }`}
        >
          <StarIcon filled={starred} />
        </button>
        <button
          type="button"
          onClick={() => setLang(next)}
          aria-label={t.languageLabel}
          title={`${t.switchTo} · ${nextLabel}`}
          className={iconClass}
        >
          <GlobeMark />
          <span className="tabular-nums">{nextLabel}</span>
        </button>
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.repositoryLabel}
          title={t.repositoryLabel}
          className="flex size-7 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          <GitHubMark />
        </a>
      </div>
    </header>
  );
}
