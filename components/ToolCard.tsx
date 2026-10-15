"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { categorySlug, type ToolDefinition } from "@/lib/tools";

export default function ToolCard({ tool }: { tool: ToolDefinition }) {
  const { toolName, toolDescription } = useLang();
  const cat = categorySlug(tool.category);

  return (
    <Link
      href={`/${cat}/${tool.id}`}
      className="flex items-start gap-3 rounded border border-neutral-200 bg-neutral-50 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
    >
      <span className="mt-0.5 w-6 shrink-0 text-center font-mono text-xs text-neutral-400">
        {tool.badge}
      </span>
      <span>
        <span className="block text-sm font-medium">{toolName(tool)}</span>
        <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
          {toolDescription(tool)}
        </span>
      </span>
    </Link>
  );
}
