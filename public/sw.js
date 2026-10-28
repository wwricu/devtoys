// Chromium only offers to install a site whose service worker answers fetches.
// This one deliberately caches nothing: every request goes to the network, so a
// deploy is never shadowed by stale assets. Offline support is a separate job.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
