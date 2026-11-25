import { createHmac, timingSafeEqual } from "node:crypto";

// The emails Toran sends committees (the weekly email, decision 0030; the
// seva emails, decision 0029; "It's live", decision 0028): the one switch
// that turns them all on (COMMITTEE_EMAIL), and the signed links that stop
// each one for one member and one mandir.

export function committeeEmailOn(
  setting: string | undefined = process.env.COMMITTEE_EMAIL,
): boolean {
  return setting === "on";
}

// Which committee email a stop link is for: the weekly one (called
// "monthly" in links and the database, from before decision 0030, so old
// links keep working), or the seva emails (lib/seva-email.ts). Each is
// stopped on its own.
export type EmailKind = "monthly" | "seva";

export function emailKind(value: unknown): EmailKind {
  return value === "seva" ? "seva" : "monthly";
}

// The code in each member's "stop" link: worked out from who they are,
// which mandir and which email, with a secret only the site knows
// (CRON_SECRET), so it needn't be stored and can't be made up for someone
// else. The weekly email's codes are the monthly email's, unchanged, so old
// links still work.
export function stopCode(
  userId: string,
  mandirId: string,
  secret: string | undefined = process.env.CRON_SECRET,
  kind: EmailKind = "monthly",
): string | null {
  if (!secret) return null;
  const what =
    kind === "monthly" ? "committee-email" : `committee-email:${kind}`;
  return createHmac("sha256", secret)
    .update(`${what}:${userId}:${mandirId}`)
    .digest()
    .subarray(0, 24)
    .toString("base64url");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function checkStopCode(
  userId: unknown,
  mandirId: unknown,
  code: unknown,
  secret: string | undefined = process.env.CRON_SECRET,
  kind: EmailKind = "monthly",
): boolean {
  if (
    typeof userId !== "string" ||
    typeof mandirId !== "string" ||
    typeof code !== "string" ||
    !UUID.test(userId) ||
    !UUID.test(mandirId)
  ) {
    return false;
  }
  const expected = stopCode(userId, mandirId, secret, kind);
  if (!expected) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function stopQuery(
  userId: string,
  mandirId: string,
  code: string,
  kind: EmailKind,
): string {
  return new URLSearchParams({
    u: userId,
    m: mandirId,
    c: code,
    ...(kind !== "monthly" && { k: kind }),
  }).toString();
}

export function stopUrl(
  site: string,
  userId: string,
  mandirId: string,
  code: string,
  kind: EmailKind = "monthly",
): string {
  return `${site}/committee-email/stop?${stopQuery(userId, mandirId, code, kind)}`;
}

// For an email program's own "Unsubscribe" button (List-Unsubscribe-Post).
export function oneClickStopUrl(
  site: string,
  userId: string,
  mandirId: string,
  code: string,
  kind: EmailKind = "monthly",
): string {
  return `${site}/api/committee-email/stop?${stopQuery(userId, mandirId, code, kind)}`;
}

// The headers that give an email program its own Unsubscribe button.
export function unsubscribeHeaders(
  site: string,
  userId: string,
  mandirId: string,
  code: string,
  kind: EmailKind = "monthly",
): Record<string, string> {
  return {
    "List-Unsubscribe": `<${oneClickStopUrl(site, userId, mandirId, code, kind)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
