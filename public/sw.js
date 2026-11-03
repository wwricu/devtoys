// A registered worker is all Chromium needs to offer install these days, so an
// empty fetch handler is only overhead. This worker caches nothing: every
// request goes to the network, so a deploy is never shadowed by stale assets.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
