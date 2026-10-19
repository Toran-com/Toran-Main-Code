// Words that mark an event as part of a festival, so festival pages can
// gather events committees added without linking them. Lower case, and
// matched as whole words ("holi" isn't in "holiday"; "garbas" still counts).
export const FESTIVAL_WORDS: Record<string, string[]> = {
  navratri: ["navratri", "navaratri", "navratra", "garba", "dandiya", "raas"],
  dussehra: ["dussehra", "dasara", "vijayadashami", "vijaya dashami"],
  "sharad-purnima": ["sharad purnima", "sharad poonam", "kojagari"],
  dhanteras: ["dhanteras", "dhantrayodashi", "lakshmi puja", "laxmi puja"],
  diwali: ["diwali", "deepavali", "divali", "lakshmi puja", "laxmi puja"],
  annakut: ["annakut", "annakoot", "new year", "nutan varsh", "bestu varas"],
  "bhai-dooj": ["bhai dooj", "bhai bij", "bhaubeej", "bhai tika"],
  "labh-pancham": ["labh pancham", "labh panchami", "gyan panchami"],
  "dev-diwali": ["dev diwali", "dev deepavali", "kartik purnima"],
  uttarayan: ["uttarayan", "makar sankranti", "sankranti", "kite"],
  "vasant-panchami": ["vasant panchami", "basant panchami", "saraswati puja"],
  "maha-shivaratri": ["shivaratri", "shivratri", "mahashivratri"],
  "holika-dahan": ["holika", "holika dahan", "holi bonfire"],
  holi: ["holi", "holika", "phagwa"],
  "ram-navami": ["ram navami", "rama navami", "ramnavami"],
  "hanuman-jayanti": ["hanuman jayanti", "hanuman jayanthi"],
  "guru-purnima": ["guru purnima", "guru poornima", "vyasa purnima"],
  "raksha-bandhan": ["raksha bandhan", "rakshabandhan", "rakhi"],
  janmashtami: ["janmashtami", "janmastami", "krishna jayanti", "gokulashtami"],
  "ganesh-chaturthi": [
    "ganesh chaturthi",
    "vinayaka chaturthi",
    "ganeshotsav",
    "visarjan",
  ],
};

export function mentionsFestival(
  slug: string,
  text: string | null | undefined,
): boolean {
  const words = FESTIVAL_WORDS[slug] ?? [slug.replace(/-/g, " ")];
  const haystack = (text ?? "").toLowerCase();
  return words.some((w) =>
    new RegExp(`(^|[^a-z])${w}s?([^a-z]|$)`).test(haystack),
  );
}
