"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCategories } from "@/lib/tools";
import { useLang } from "@/lib/i18n";

export default function HomeContent() {
  const { t, toolName, toolDescription, categoryName } = useLang();
  const wanted = useSearchParams().get("category");
  const all = getCategories();
  const picked = wanted ? all.filter((c) => c.name === wanted) : [];
  // An unknown ?category= falls back to the full list so the link never 404s.
  const shown = picked.length > 0 ? picked : all;
  const single = picked.length === 1 ? picked[0] : null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-lg font-semibold">
        {single ? categoryName(single.name) : t.siteName}
      </h1>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {single ? (
          <Link href="/" className="underline-offset-2 hover:underline">
            {t.allCategories}
          </Link>
        ) : (
          t.homeIntro
        )}
      </p>
      {shown.map((c) => (
        <section key={c.name} className="mt-5">
          {!single && (
            <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              {categoryName(c.name)}
            </h2>
          )}
          <div
            className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${single ? "" : "mt-2"}`}
          >
            {c.tools.map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className="flex items-start gap-3 rounded border border-neutral-200 bg-neutral-50 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
              >
                <span className="mt-0.5 w-6 shrink-0 text-center font-mono text-xs text-neutral-400">
                  {tool.badge}
                </span>
                <span>
                  <span className="block text-sm font-medium">
                    {toolName(tool)}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                    {toolDescription(tool)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
