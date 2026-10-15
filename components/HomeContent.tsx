"use client";

import { Fragment } from "react";
import { getCategories } from "@/lib/tools";
import { useLang, getLang, switchLang, type Lang, repoUrl } from "@/lib/i18n";
import ToolCard from "@/components/ToolCard";
import ToolGrid from "@/components/ToolGrid";

function GlobeMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 1a6 6 0 0 0-4.243 10.243l1.415-2.477A9.956 9.956 0 0 1 4.5 8c0-.62.09-1.217.258-1.78l-1.53-2.678A5.98 5.98 0 0 1 8 2Zm0 12a6 6 0 0 0 4.243-10.243l-1.415 2.477c.418.553.714 1.15.872 1.78l1.53 2.678A5.98 5.98 0 0 1 8 14Zm-2.5-5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

export default function HomeContent() {
  const { t, categoryName } = useLang();

  const currentLang = getLang();
  const nextLang: Lang = currentLang === "zh" ? "en" : "zh";

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between pb-2">
          <h1 className="text-lg font-semibold">{t.siteName}</h1>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => switchLang(nextLang)}
              title={nextLang === "zh" ? "Switch to English" : "切换到中文"}
              aria-label={nextLang === "zh" ? "Switch to English" : "切换到中文"}
              className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <GlobeMark />
            </button>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View on GitHub"
              aria-label="View on GitHub"
              className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <GitHubMark />
            </a>
          </div>
        </div>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {t.homeIntro}
        </p>
      </div>
      <div className="mt-4">
        <ToolGrid>
          {getCategories().map((c) => (
            <Fragment key={c.name}>
              <h2 className="col-span-full text-xs font-medium uppercase tracking-wide text-neutral-400">
                {categoryName(c.name)}
              </h2>
              {c.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </Fragment>
          ))}
        </ToolGrid>
      </div>
    </div>
  );
}
