"use client";

import { getTool } from "@/lib/tools";
import { useLang } from "@/lib/i18n";

export default function ToolHeader({ id }: { id: string }) {
  const { toolName, toolDescription } = useLang();
  const tool = getTool(id);
  if (!tool) return null;

  return (
    <header className="shrink-0 pb-2">
      <h1 className="text-sm font-semibold">{toolName(tool)}</h1>
      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        {toolDescription(tool)}
      </p>
    </header>
  );
}
