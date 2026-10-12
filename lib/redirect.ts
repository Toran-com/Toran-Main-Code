// Only ever send people back to a page on this site after login, never to
// another website (an "open redirect" would let phishing links borrow our
// address).
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/account",
): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  try {
    const url = new URL(next, "https://toran.invalid");
    if (url.origin !== "https://toran.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

// A sensible check that an email address could be real; Supabase does the
// rest by actually sending to it.
export function looksLikeEmail(value: string): boolean {
  return (
    value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
  );
}
