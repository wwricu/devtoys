"use client";

import { useLang } from "@/lib/i18n";

/**
 * Shared frame for the home and category listings. One fluid grid for the whole
 * page, with category headings spanning both columns, so every card keeps the
 * same height and the prerendered markup never reflows.
 */
export default function ToolGrid({ children }: { children: React.ReactNode }) {
  const { t } = useLang();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">{children}</div>
      <p className="mt-5 text-xs text-neutral-400">{t.privacyFooter}</p>
    </div>
  );
}
