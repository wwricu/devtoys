"use client";

import { useEffect } from "react";
import { rememberTool } from "@/lib/recentTools";

/** Records the visit for the warm-up order without making the shell client. */
export default function RememberTool({ id }: { id: string }) {
  useEffect(() => {
    rememberTool(id);
  }, [id]);
  return null;
}
