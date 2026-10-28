"use client";

import { useEffect } from "react";

const APP_NAME = "Dev Toys";

// A browser tab names the current tool for search and tab switching, but an
// installed app's title bar should read just the app name. Next rewrites the
// title on every route change, so keep watching rather than set it once.
export default function StandaloneTitle() {
  useEffect(() => {
    const installed =
      window.matchMedia(
        "(display-mode: standalone), (display-mode: minimal-ui), (display-mode: window-controls-overlay)",
      ).matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!installed) return;

    const apply = () => {
      if (document.title !== APP_NAME) document.title = APP_NAME;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
