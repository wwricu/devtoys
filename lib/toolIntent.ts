import { useRouter } from "next/navigation";
import { preloadTool } from "./toolModule";

/** Hover/focus prefetch for tool links: route data now, chunk now, nothing
 *  eager. The default viewport prefetch would queue every visible link's
 *  segment (39 links, ~130 KB on the home page alone). */
export function useToolIntent() {
  const router = useRouter();
  return (href: string, id?: string) => {
    router.prefetch(href);
    if (id) preloadTool(id);
  };
}
