"use client";

import { getCategory } from "@/lib/tools";
import { useLang } from "@/lib/i18n";
import ToolCard from "@/components/ToolCard";
import ToolGrid from "@/components/ToolGrid";

/** Listing for one category, addressed by its slugified English name. */
export default function CategoryContent({ slug }: { slug: string }) {
  const { t, categoryName } = useLang();
  const category = getCategory(slug);
  if (!category) return null;

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-lg font-semibold">{categoryName(category.name)}</h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {t.categoriesIntro}
        </p>
      </div>
      <div className="mt-4">
        <ToolGrid>
          {category.tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </ToolGrid>
      </div>
    </div>
  );
}
