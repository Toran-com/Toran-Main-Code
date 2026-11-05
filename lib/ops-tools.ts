import type { OpsIconName } from "@/components/ops-icon";

// The admin area's tools, grouped by what the work is: the menu
// (components/ops-nav.tsx) and the dashboard's cards both come from here.

export type OpsCountKey = "claims" | "attention" | "review";
export type OpsCounts = Partial<Record<OpsCountKey, number>>;

export type OpsTool = {
  href: string;
  label: string;
  about: string;
  icon: OpsIconName;
  count?: OpsCountKey;
};

export const OPS_GROUPS: { label: string; tools: OpsTool[] }[] = [
  {
    label: "Overview",
    tools: [
      {
        href: "/ops",
        label: "Dashboard",
        about: "Claims to check and how things stand.",
        icon: "grid",
        count: "claims",
      },
      {
        href: "/ops/today",
        label: "Today",
        about: "Visits, new events and the nightly job, today.",
        icon: "sun",
      },
      {
        href: "/ops/attention",
        label: "Needs attention",
        about: "Reports, stale details and checks to follow up.",
        icon: "alert",
        count: "attention",
      },
      {
        href: "/ops/stats",
        label: "Stats",
        about: "Visits by page and by week, without cookies.",
        icon: "chart",
      },
    ],
  },
  {
    label: "Content",
    tools: [
      {
        href: "/ops/posters",
        label: "Review queue",
        about: "Posters and found events to check before they go live.",
        icon: "inbox",
        count: "review",
      },
      {
        href: "/ops/mandirs",
        label: "Mandirs",
        about: "Add, edit and hide mandirs, or import a list.",
        icon: "mandir",
      },
      {
        href: "/ops/duplicates",
        label: "Duplicates",
        about: "The same event listed twice, to merge.",
        icon: "copy",
      },
      {
        href: "/ops/websites",
        label: "Websites",
        about: "What the nightly job found on mandirs' websites.",
        icon: "globe",
      },
      {
        href: "/ops/festivals",
        label: "Festival dates",
        about: "The festival calendar every page uses.",
        icon: "calendar",
      },
    ],
  },
  {
    label: "Messages",
    tools: [
      {
        href: "/ops/digest",
        label: "Weekly digest",
        about: "The weekly email to families, as it would go out.",
        icon: "mail",
      },
      {
        href: "/ops/committee-email",
        label: "Committee email",
        about: "The monthly email to each mandir's committee.",
        icon: "send",
      },
      {
        href: "/ops/translations",
        label: "Translations",
        about: "Gujarati and Hindi waiting for a reviewer.",
        icon: "language",
      },
    ],
  },
];

// The tool a page belongs to: the longest one its address starts with.
export function currentTool(path: string): string {
  let best = "/ops";
  for (const group of OPS_GROUPS) {
    for (const { href } of group.tools) {
      if (
        (path === href || path.startsWith(`${href}/`)) &&
        href.length > best.length
      ) {
        best = href;
      }
    }
  }
  return best;
}
