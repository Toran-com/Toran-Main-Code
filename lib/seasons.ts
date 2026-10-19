// The festival seasons that get a page of their own at /<slug>: several
// festivals close together that families think of as one (Diwali week,
// the nine nights of Navratri), or one big festival. Only words here, so
// the visit counter can list the pages without loading anything else.

export type Season = {
  // The page's address: /<slug>.
  slug: string;
  name: string;
  // The festival the season is named after; the others are found near it.
  main: string;
  festivals: string[];
  // What the season is called in "All of … at mandirs".
  period: string;
  title: string;
  description: string;
  intro: string;
  // The line under the title on the link preview picture.
  cardDetail: string;
  shareText: string;
};

export const DIWALI: Season = {
  slug: "diwali",
  name: "Diwali",
  main: "diwali",
  festivals: ["dhanteras", "diwali", "annakut", "bhai-dooj"],
  period: "Diwali week",
  title: "Diwali at UK mandirs",
  description:
    "Diwali week at Hindu mandirs across the UK: Dhanteras, Lakshmi puja, Annakut and New Year, and Bhai Dooj. Find what's on near you.",
  intro:
    "Lakshmi puja, fireworks, Annakut and the New Year: what mandirs across the UK are doing for Diwali week, all in one place.",
  cardDetail: "Lakshmi puja, Annakut, fireworks and more, near you",
  shareText: "Diwali at mandirs across the UK: what's on near you",
};

export const NAVRATRI: Season = {
  slug: "navratri",
  name: "Navratri",
  main: "navratri",
  festivals: ["navratri", "dussehra", "sharad-purnima"],
  period: "Navratri",
  title: "Navratri at UK mandirs",
  description:
    "Navratri at Hindu mandirs across the UK: nine nights of Garba and Raas, Dussehra and Sharad Purnima. Find what's on near you.",
  intro:
    "Nine nights of Garba and Raas, then Dussehra and Sharad Purnima: what mandirs across the UK are doing for Navratri, all in one place.",
  cardDetail: "Garba, Raas, Dussehra and more, near you",
  shareText: "Navratri Garba at mandirs across the UK: what's on near you",
};

export const MAHA_SHIVARATRI: Season = {
  slug: "maha-shivaratri",
  name: "Maha Shivaratri",
  main: "maha-shivaratri",
  festivals: ["maha-shivaratri"],
  period: "Maha Shivaratri",
  title: "Maha Shivaratri at UK mandirs",
  description:
    "Maha Shivaratri at Hindu mandirs across the UK: abhishek, bhajans and all-night worship of Shiva. Find what's on near you.",
  intro:
    "Abhishek, bhajans and the all-night jagran: what mandirs across the UK are doing for Maha Shivaratri, all in one place.",
  cardDetail: "Abhishek, bhajans and all-night worship, near you",
  shareText: "Maha Shivaratri at mandirs across the UK: what's on near you",
};

export const HOLI: Season = {
  slug: "holi",
  name: "Holi",
  main: "holi",
  festivals: ["holika-dahan", "holi"],
  period: "Holi",
  title: "Holi at UK mandirs",
  description:
    "Holi at Hindu mandirs across the UK: the Holika Dahan bonfire and the festival of colours. Find what's on near you.",
  intro:
    "The Holika Dahan bonfire, then a day of colours: what mandirs across the UK are doing for Holi, all in one place.",
  cardDetail: "Holika Dahan and the festival of colours, near you",
  shareText: "Holi at mandirs across the UK: what's on near you",
};

export const RAM_NAVAMI: Season = {
  slug: "ram-navami",
  name: "Ram Navami",
  main: "ram-navami",
  festivals: ["ram-navami", "hanuman-jayanti"],
  period: "Ram Navami",
  title: "Ram Navami at UK mandirs",
  description:
    "Ram Navami and Hanuman Jayanti at Hindu mandirs across the UK: the birth of Shri Ram, with puja, katha and bhajans. Find what's on near you.",
  intro:
    "The birth of Shri Ram, and Hanuman Jayanti a few days later: what mandirs across the UK are doing, all in one place.",
  cardDetail: "Ram Navami and Hanuman Jayanti, near you",
  shareText: "Ram Navami at mandirs across the UK: what's on near you",
};

export const JANMASHTAMI: Season = {
  slug: "janmashtami",
  name: "Janmashtami",
  main: "janmashtami",
  festivals: ["janmashtami"],
  period: "Janmashtami",
  title: "Janmashtami at UK mandirs",
  description:
    "Janmashtami at Hindu mandirs across the UK: the birth of Shri Krishna, with bhajans, the midnight aarti and the cradle. Find what's on near you.",
  intro:
    "Bhajans, the cradle and the midnight aarti for the birth of Shri Krishna: what mandirs across the UK are doing, all in one place.",
  cardDetail: "Bhajans and the midnight aarti, near you",
  shareText: "Janmashtami at mandirs across the UK: what's on near you",
};

export const GANESH_CHATURTHI: Season = {
  slug: "ganesh-chaturthi",
  name: "Ganesh Chaturthi",
  main: "ganesh-chaturthi",
  festivals: ["ganesh-chaturthi"],
  period: "Ganesh Chaturthi",
  title: "Ganesh Chaturthi at UK mandirs",
  description:
    "Ganesh Chaturthi at Hindu mandirs across the UK: Ganesh puja, aarti and visarjan. Find what's on near you.",
  intro:
    "Ganesh puja, modak and visarjan: what mandirs across the UK are doing for Ganesh Chaturthi, all in one place.",
  cardDetail: "Ganesh puja, aarti and visarjan, near you",
  shareText: "Ganesh Chaturthi at mandirs across the UK: what's on near you",
};

// In the order they come round each year, from spring.
export const SEASONS: Season[] = [
  MAHA_SHIVARATRI,
  HOLI,
  RAM_NAVAMI,
  JANMASHTAMI,
  GANESH_CHATURTHI,
  NAVRATRI,
  DIWALI,
];

export function seasonBySlug(slug: string): Season | undefined {
  return SEASONS.find((s) => s.slug === slug);
}

// The season a festival belongs to, for "All of … at mandirs" links.
export function seasonOf(festivalSlug: string): Season | undefined {
  return SEASONS.find((s) => s.festivals.includes(festivalSlug));
}
