"use client";

import { useMemo } from "react";
import { getFavouritesCategory, useFavourites } from "@/lib/favorites";
import ToolGrid from "@/components/ToolGrid";
import ToolCard from "@/components/ToolCard";
import { useLang } from "@/lib/i18n";

export default function FavouritesContent() {
  const { t } = useLang();
  const { favs } = useFavourites();
  const cat = useMemo(() => getFavouritesCategory(favs), [favs]);

  if (!cat || cat.tools.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-lg font-semibold">{t.favouritesTitle}</h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {t.favouritesEmpty}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-lg font-semibold">{t.favouritesTitle}</h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {t.categoriesIntro}
        </p>
      </div>
      <div className="mt-4">
        <ToolGrid>
          {cat.tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </ToolGrid>
      </div>
    </div>
  );
}
