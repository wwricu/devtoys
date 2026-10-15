"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { getTool } from "@/lib/tools";

const cache = new Map<string, ComponentType>();

function getToolComponent(id: string): ComponentType | null {
  const tool = getTool(id);
  if (!tool) return null;
  let comp = cache.get(id);
  if (!comp) {
    comp = dynamic(tool.load, {
      ssr: false,
      loading: () => (
        <div className="flex h-40 items-center justify-center text-xs text-neutral-400">
          Loading tool…
        </div>
      ),
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
