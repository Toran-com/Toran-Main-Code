// Toran's service worker: keeps the public pages a visitor has opened, so
// What's on and their mandir's page still open without signal (inside a
// mandir hall, on the Tube). Only public pages are kept: never the admin
// area, a committee's pages, logging in or anything personal.

const VERSION = "v1";
const PAGES = `toran-pages-${VERSION}`;
const ASSETS = `toran-assets-${VERSION}`;
// The pages of the mandirs a visitor follows (components/follow.tsx), kept
// apart so they're never pushed out by other pages.
const FOLLOWED = `toran-followed-${VERSION}`;
const FOLLOWED_PAGE = /^(\/gu)?\/mandirs\/[a-z0-9-]+$/;
const REFRESH_MS = 12 * 60 * 60 * 1000;
const OFFLINE = "/offline";
const MAX_PAGES = 40;

// Pages worth keeping for offline use.
const PUBLIC = [
  /^\/$/,
  /^\/whats-on$/,
  /^\/mandirs$/,
  /^\/mandirs\/[a-z0-9-]+$/,
  /^\/festivals$/,
  /^\/festivals\/[a-z0-9-]+$/,
  /^\/for-mandirs$/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(OFFLINE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("toran-") &&
                ![PAGES, ASSETS, FOLLOWED].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function keepPage(request, response) {
  const cache = await caches.open(PAGES);
  await cache.put(request, response);
  const keys = await cache.keys();
  // Oldest first; the offline page always stays.
  const extra = keys.filter((k) => new URL(k.url).pathname !== OFFLINE);
  for (const old of extra.slice(0, Math.max(0, extra.length - MAX_PAGES))) {
    await cache.delete(old);
  }
}

// Keeps the followed mandirs' pages (fetched again when over 12 hours
// old), and lets go of ones no longer followed.
async function keepFollowed(paths) {
  const wanted = new Set(
    (Array.isArray(paths) ? paths : [])
      .filter((p) => typeof p === "string" && FOLLOWED_PAGE.test(p))
      .slice(0, 30),
  );
  const cache = await caches.open(FOLLOWED);
  for (const kept of await cache.keys()) {
    if (!wanted.has(new URL(kept.url).pathname)) await cache.delete(kept);
  }
  for (const path of wanted) {
    const kept = await cache.match(path);
    const age = kept
      ? Date.now() - Date.parse(kept.headers.get("date") ?? "")
      : Infinity;
    if (age < REFRESH_MS) continue;
    try {
      const response = await fetch(path, { cache: "no-cache" });
      if (response.ok && !response.redirected) await cache.put(path, response);
    } catch {
      // Offline now: the copy already kept (if any) stays.
    }
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "followed") {
    event.waitUntil(keepFollowed(event.data.paths));
  }
});

// Pages: always try the network first, so visitors see the latest; fall
// back to the kept copy, then to the offline page. "no-cache" makes the
// browser check with the server: pages say a cache may serve an old copy
// while it fetches a new one (stale-while-revalidate), which browsers
// ignore when opening a page but honour for a service worker's fetch.
async function page(request, url) {
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (
      response.ok &&
      !response.redirected &&
      PUBLIC.some((pattern) => pattern.test(url.pathname))
    ) {
      await keepPage(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(PAGES);
    const followed = await caches.open(FOLLOWED);
    return (
      (await cache.match(request, { ignoreSearch: false })) ??
      (await followed.match(request)) ??
      (await cache.match(OFFLINE)) ??
      Response.error()
    );
  }
}

// The site's own scripts, styles and fonts never change once published
// (their names change instead), so a kept copy is always right.
async function asset(request) {
  const cache = await caches.open(ASSETS);
  const kept = await cache.match(request);
  if (kept) return kept;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(page(request, url));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(asset(request));
  }
});
