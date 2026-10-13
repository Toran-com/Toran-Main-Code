// Words that mark an event as part of a festival, so festival pages can
// gather events committees added without linking them. Lower case.
export const FESTIVAL_WORDS: Record<string, string[]> = {
  navratri: ["navratri", "navaratri", "navratra", "garba", "dandiya", "raas"],
  dussehra: ["dussehra", "dasara", "vijayadashami", "vijaya dashami"],
  dhanteras: ["dhanteras", "dhantrayodashi", "lakshmi puja", "laxmi puja"],
  diwali: ["diwali", "deepavali", "divali", "lakshmi puja", "laxmi puja"],
  annakut: ["annakut", "annakoot", "new year", "nutan varsh", "bestu varas"],
  "bhai-dooj": ["bhai dooj", "bhai bij", "bhaubeej", "bhai tika"],
  "maha-shivaratri": ["shivaratri", "shivratri", "mahashivratri"],
  holi: ["holi", "holika", "phagwa"],
};

export function mentionsFestival(
  slug: string,
  text: string | null | undefined,
): boolean {
  const words = FESTIVAL_WORDS[slug] ?? [slug.replace(/-/g, " ")];
  const haystack = (text ?? "").toLowerCase();
  return words.some((w) => haystack.includes(w));
}
