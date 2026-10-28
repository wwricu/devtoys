"use client";

import { useEffect } from "react";

// Chromium only offers an install affordance when a service worker is
// registered; the manifest alone is not enough. Skipped in dev so a worker
// left over from a production run can never shadow local changes.
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
