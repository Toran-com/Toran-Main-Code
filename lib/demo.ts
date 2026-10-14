// Made-up content for the "try it" page (/demo), so a committee can see
// what Toran does before their own mandir is on it. Nothing here is a real
// mandir, event or person. Times are written as weekdays rather than dates
// so the page never goes out of date.

export const demoMandir = {
  name: "Shree Sample Mandir",
  town: "Anytown",
  region: "Example County",
  tradition: "Pushtimarg",
};

export type DemoEvent = {
  id: string;
  when: string;
  title: string;
  summary: string;
  note?: string;
  cancelled?: boolean;
};

export const demoEvents: DemoEvent[] = [
  {
    id: "aarti",
    when: "Every day · 7pm",
    title: "Sandhya aarti",
    summary: "Evening aarti in the main hall. Everyone welcome.",
  },
  {
    id: "bhajans",
    when: "Every Tuesday · 7:30pm",
    title: "Bhajan evening",
    summary: "Bring a friend; words are on the screen in Gujarati and English.",
  },
  {
    id: "garba",
    when: "Saturday · 7:30pm",
    title: "Sharad Purnima garba",
    summary: "Garba in the hall, with doodh pauva at the end.",
    note: "Main hall · Free, donations welcome",
  },
  {
    id: "classes",
    when: "Sunday · 10am",
    title: "Children's Gujarati class",
    summary: "For ages 6 to 12. Please bring a pencil and notebook.",
    note: "Upstairs classroom · £3 a week",
  },
  {
    id: "havan",
    when: "Sunday · 11am",
    title: "Monthly havan",
    summary: "Moved to next month while the hall is decorated.",
    cancelled: true,
  },
];

export type DemoRole = {
  name: string;
  description?: string;
  dbs?: boolean;
  shifts: { when: string; needed: number }[];
};

export const demoRotaEvent = "Sharad Purnima garba";

export const demoRota: DemoRole[] = [
  {
    name: "Kitchen",
    description: "Making and serving doodh pauva.",
    shifts: [
      { when: "Saturday, 5pm–7:30pm", needed: 4 },
      { when: "Saturday, 9pm–10:30pm", needed: 6 },
    ],
  },
  {
    name: "Car park",
    shifts: [{ when: "Saturday, 7pm–8:30pm", needed: 3 }],
  },
  {
    name: "Children's corner",
    dbs: true,
    shifts: [{ when: "Saturday, 7:30pm–10pm", needed: 2 }],
  },
];

// The rota as the committee would post it to its volunteers' WhatsApp
// group; the same layout as rotaMessage() in lib/seva.ts.
export function demoRotaMessage(): string {
  const roles = demoRota.map((r) =>
    [
      `*${r.name}*${r.dbs ? " (DBS check needed)" : ""}`,
      ...(r.description ? [r.description] : []),
      ...r.shifts.map(
        (s) =>
          `• ${s.when}: ${s.needed} ${s.needed === 1 ? "person" : "people"}`,
      ),
    ].join("\n"),
  );
  return [
    `Seva for ${demoRotaEvent} (Saturday, 7:30pm)`,
    ...roles,
    "Reply here if you can help. 🙏",
  ].join("\n\n");
}
