"use client";

import { getTool } from "@/lib/tools";
import { useFavourites } from "@/lib/favorites";
import { useLang } from "@/lib/i18n";

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

export default function ToolHeader({ id }: { id: string }) {
  const { toolName, toolDescription } = useLang();
  const { has, toggle } = useFavourites();
  const tool = getTool(id);
  if (!tool) return null;

  const starred = has(id);

  return (
    <header className="flex shrink-0 items-start justify-between gap-2 pb-2">
      <div>
        <h1 className="text-sm font-semibold">{toolName(tool)}</h1>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {toolDescription(tool)}
        </p>
      </div>
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
    </header>
  );
}
