// Visiting a mandir: what's there for people who need step-free access,
// a chair or a hearing loop, and what food is served. Set by the
// committee (or Toran) as ticks, so it reads the same on every page and
// translates; plus one short note for anything else.

export const FACILITY_GROUPS = {
  access: [
    "step_free",
    "lift",
    "chairs",
    "accessible_toilet",
    "hearing_loop",
    "parking",
    "blue_badge",
    "shoe_racks",
    "baby_change",
  ],
  food: ["food_served", "jain_food", "no_onion_garlic"],
} as const;

export type Facility =
  (typeof FACILITY_GROUPS)[keyof typeof FACILITY_GROUPS][number];

export const FACILITIES: readonly Facility[] = [
  ...FACILITY_GROUPS.access,
  ...FACILITY_GROUPS.food,
];

// The committee form's labels (committee and admin pages are English).
export const FACILITY_LABELS: Record<Facility, string> = {
  step_free: "Step-free way in",
  lift: "Lift to the main hall",
  chairs: "Chairs for people who can't sit on the floor",
  accessible_toilet: "Accessible toilet",
  hearing_loop: "Hearing loop",
  parking: "Parking on site",
  blue_badge: "Blue Badge parking",
  shoe_racks: "Shoe racks",
  baby_change: "Baby changing",
  food_served: "Food served to visitors",
  jain_food: "Jain food",
  no_onion_garlic: "Food without onion or garlic",
};

export const VISITING_NOTE_MAX = 400;

export const isFacility = (value: string): value is Facility =>
  (FACILITIES as readonly string[]).includes(value);

// Only known ticks, in the usual order, each once.
export function facilitiesFrom(values: unknown[]): Facility[] {
  const chosen = new Set(values.map(String));
  return FACILITIES.filter((f) => chosen.has(f));
}

// A mandir's ticks sorted into the page's two groups; empty groups left out.
export function groupFacilities(facilities: readonly string[]) {
  return (Object.keys(FACILITY_GROUPS) as (keyof typeof FACILITY_GROUPS)[])
    .map((group) => ({
      group,
      items: FACILITY_GROUPS[group].filter((f) => facilities.includes(f)),
    }))
    .filter((g) => g.items.length > 0);
}
