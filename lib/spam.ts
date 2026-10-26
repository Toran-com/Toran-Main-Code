import { createHash, randomBytes } from "node:crypto";

// Keeping the public forms ("Tell us about an event", "Correct or remove
// something") free of automated spam, without keeping anything about the
// people who use them (decision 0006). Alongside these: a hidden field
// only robots fill in, and limits in the database on how many requests
// can wait and how many can arrive in an hour.

// 1. What's written -----------------------------------------------------

const LINK = /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\./gi;
// Link markup that only spam robots write in a plain text box.
const MARKUP = /<a\s+href|\[url[=\]]|\[link[=\]]/i;
const JUNK =
  /\b(viagra|cialis|casino|porn|escorts?|backlinks?|seo services|forex|bitcoin|crypto ?currency|payday loans?)\b/i;

export const MAX_LINKS = 2;

export function linkCount(text: string): number {
  return text.match(LINK)?.length ?? 0;
}

// "links": too many web addresses, which a person can fix. "junk": link
// markup or spam words, which a person wouldn't write; the robot is
// thanked as if it worked, so it has nothing to learn from.
export function spamCheck(texts: string[]): "ok" | "links" | "junk" {
  const all = texts.join("\n");
  if (MARKUP.test(all) || JUNK.test(all)) return "junk";
  if (linkCount(all) > MAX_LINKS) return "links";
  return "ok";
}

// 2. How often ----------------------------------------------------------

// At most this many sends of one form from one place in the window. Kept
// in this server's memory only, never written anywhere, under a one-way
// code that changes whenever the server restarts; gone after the window.
// With several servers running it's a speed bump, not a wall: the hourly
// limit in the database is the wall.
export const SENDS_PER_WINDOW = 5;
export const WINDOW_MS = 10 * 60_000;

export class SendLimiter {
  private readonly salt = randomBytes(16);
  private readonly sends = new Map<string, number[]>();

  constructor(
    private readonly limit = SENDS_PER_WINDOW,
    private readonly window = WINDOW_MS,
  ) {}

  private key(form: string, from: string) {
    return createHash("sha256")
      .update(this.salt)
      .update(`${form}\u0000${from}`)
      .digest("base64url");
  }

  // Counts a send and says whether it's allowed. No address, no limit:
  // better to let one through than to turn people away.
  allow(form: string, from: string | null, now = Date.now()): boolean {
    if (!from) return true;
    const since = now - this.window;
    // Forget everyone whose window has passed.
    for (const [key, times] of this.sends) {
      if (times[times.length - 1] <= since) this.sends.delete(key);
    }
    const key = this.key(form, from);
    const recent = (this.sends.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.limit) {
      this.sends.set(key, recent);
      return false;
    }
    this.sends.set(key, [...recent, now]);
    return true;
  }
}

export const sendLimiter = new SendLimiter();

// Where a request came from, as the hosting platform reports it. This
// machine itself (tests, local runs) doesn't count as anywhere.
export function senderAddress(headers: Headers): string | null {
  const address =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim();
  if (!address || /^(127\.|::1$|::ffff:127\.)/.test(address)) return null;
  return address;
}
