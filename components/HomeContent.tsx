"use client";

import { Fragment } from "react";
import { getCategories } from "@/lib/tools";
import { useLang } from "@/lib/i18n";
import ToolCard from "@/components/ToolCard";
import ToolGrid from "@/components/ToolGrid";

export default function HomeContent() {
  const { t, categoryName } = useLang();

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-lg font-semibold">{t.siteName}</h1>
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
