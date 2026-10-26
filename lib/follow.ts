// Following a mandir without an account: the mandirs a visitor follows are
// kept on their phone only (localStorage), never sent to Toran except as
// the address of What's on when they choose "Only mandirs I follow"
// (?mandirs=a,b). Nothing about the visitor is stored (decision 0006).

const KEY = "toran:following";
const CHANGED = "toran:following-changed";
export const MAX_FOLLOWED = 30;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// A list of mandir addresses, cleaned up: real-looking ones only, each
// once, at most MAX_FOLLOWED. From storage, or from ?mandirs= on the server.
export function cleanSlugs(value: unknown): string[] {
  const text = Array.isArray(value)
    ? value.filter((s) => typeof s === "string").join(",")
    : typeof value === "string"
      ? value
      : "";
  const slugs = text
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length <= 100 && SLUG.test(s));
  return [...new Set(slugs)].slice(0, MAX_FOLLOWED);
}

// What's stored, as text, so it can be compared between renders.
export function followingSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function parseFollowing(snapshot: string): string[] {
  try {
    return cleanSlugs(JSON.parse(snapshot || "[]"));
  } catch {
    return [];
  }
}

export function setFollowing(slug: string, on: boolean) {
  const now = parseFollowing(followingSnapshot()).filter((s) => s !== slug);
  const next = on ? cleanSlugs([slug, ...now]) : now;
  try {
    if (next.length) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // Not saved; nothing else to do.
  }
  window.dispatchEvent(new Event(CHANGED));
}

// For useSyncExternalStore: changes here, and in other tabs.
export function onFollowingChange(callback: () => void) {
  window.addEventListener(CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}
