"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { getTool } from "@/lib/tools";
import { useLang } from "@/lib/i18n";

const cache = new Map<string, ComponentType>();

function LoadingTool() {
  const { t } = useLang();
  return (
    <div className="flex h-40 items-center justify-center text-xs text-neutral-400">
      {t.loadingTool}
    </div>
  );
}

function getToolComponent(id: string): ComponentType | null {
  const tool = getTool(id);
  if (!tool) return null;
  let comp = cache.get(id);
  if (!comp) {
    comp = dynamic(tool.load, {
      ssr: false,
      loading: LoadingTool,
    }) as ComponentType;
    cache.set(id, comp);
  }
  return comp;
}

export default function ToolLoader({ id }: { id: string }) {
  const Comp = getToolComponent(id);
  if (!Comp) return null;
  return <Comp />;
}
