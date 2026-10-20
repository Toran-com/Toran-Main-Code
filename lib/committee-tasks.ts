import { londonDate } from "@/lib/london";
import { daysBetween } from "@/lib/quick-events";

// What a mandir's committee should do next, for the top of its page
// (/manage/[slug]) and the account page: posters to check, events nobody
// has confirmed lately, seva shifts still short, a festival coming up with
// nothing added for it. New committees also get a short setup checklist.
// Pure, so it is tested on its own; the pages load the facts.

export type CommitteeFacts = {
  slug: string;
  // Today in London ("2026-10-20") and now.
  today: string;
  now: Date;
  // Upcoming events, with each one's next date.
  events: {
    id: string;
    title: string;
    status: string;
    confirmed_at: string | null;
    next_starts_at: string;
  }[];
  // Posters and messages waiting for the committee to check.
  posters: number;
  // Festivals coming up that the mandir hasn't added an event for.
  festivals: { title: string; date: string }[];
  // Seva shifts in the next fortnight with places still free.
  shortShifts: {
    eventId: string;
    eventTitle: string;
    starts_at: string;
    free: number;
  }[];
  // How many events the mandir has ever added on Toran, past ones too.
  eventsEver: number;
  members: number;
  invites: number;
  details: {
    postcode: string | null;
    website: string | null;
    phone: string | null;
  };
};

export type CommitteeTask = {
  key: string;
  title: string;
  detail: string;
  href: string;
  action: string;
};

export type SetupStep = {
  key: string;
  title: string;
  detail: string;
  href: string;
  done: boolean;
};

// An event is due a "Still on" once it's this close and hasn't been
// confirmed for this long.
export const CONFIRM_WITHIN_DAYS = 30;
const CONFIRMED_FOR_DAYS = 30;
// A festival is worth mentioning once it's this close.
export const FESTIVAL_WITHIN_DAYS = 21;

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function setupSteps(f: CommitteeFacts): SetupStep[] {
  return [
    {
      key: "details",
      title: "Check your mandir's details",
      detail:
        "Postcode, and a website or phone number, so families can find you.",
      href: "#details",
      done: !!f.details.postcode && !!(f.details.website || f.details.phone),
    },
    {
      key: "event",
      title: "Add your first event",
      detail:
        "A festival, a weekly aarti or a class: anything families can come to.",
      href: "#add-event",
      done: f.eventsEver > 0,
    },
    {
      key: "colleague",
      title: "Invite a colleague",
      detail: "So you're not the only one keeping the page up to date.",
      href: "#committee",
      done: f.members > 1 || f.invites > 0,
    },
  ];
}

export function setupDone(f: CommitteeFacts): boolean {
  return setupSteps(f).every((s) => s.done);
}

export function committeeTasks(f: CommitteeFacts): CommitteeTask[] {
  const tasks: CommitteeTask[] = [];
  const settingUp = !setupDone(f);

  if (f.posters > 0) {
    tasks.push({
      key: "posters",
      title: `Check ${plural(f.posters, "poster", "posters")} sent in for your mandir`,
      detail: "Publish what's right; nothing goes on your page until you do.",
      href: "#posters",
      action: f.posters === 1 ? "Check it" : "Check them",
    });
  }

  const unconfirmed = f.events.filter(
    (e) =>
      e.status === "published" &&
      daysUntil(f, e.next_starts_at) <= CONFIRM_WITHIN_DAYS &&
      (!e.confirmed_at ||
        f.now.getTime() - new Date(e.confirmed_at).getTime() >
          CONFIRMED_FOR_DAYS * 86_400_000),
  );
  if (unconfirmed.length) {
    tasks.push({
      key: "confirm",
      title:
        unconfirmed.length === 1
          ? `Is “${unconfirmed[0].title}” still on?`
          : `Are ${unconfirmed.length} events coming up still on?`,
      detail: "Press “Still on” and families see “Confirmed by the mandir”.",
      href: "#upcoming",
      action: unconfirmed.length === 1 ? "Check it" : "Check them",
    });
  }

  if (f.shortShifts.length) {
    const byEvent = new Map<string, { title: string; free: number }>();
    for (const s of f.shortShifts) {
      const e = byEvent.get(s.eventId) ?? { title: s.eventTitle, free: 0 };
      e.free += s.free;
      byEvent.set(s.eventId, e);
    }
    const [firstId, first] = [...byEvent.entries()][0];
    const others = byEvent.size - 1;
    tasks.push({
      key: "seva",
      title: `${plural(first.free, "seva place", "seva places")} still free for ${first.title}${others ? ` (and ${plural(others, "other event", "other events")})` : ""}`,
      detail:
        "Share the rota in your volunteers' group, or count in people who said yes.",
      href: `/manage/${f.slug}/seva/${firstId}`,
      action: "Open the rota",
    });
  }

  const festival = f.festivals.find(
    (x) => daysBetween(f.today, x.date) <= FESTIVAL_WITHIN_DAYS,
  );
  if (festival) {
    const days = daysBetween(f.today, festival.date);
    tasks.push({
      key: "festival",
      title:
        days <= 0
          ? `${festival.title} is today`
          : days === 1
            ? `${festival.title} is tomorrow`
            : `${festival.title} is in ${days} days`,
      detail: "Add your programme so families can find it and share it.",
      href: "#festivals",
      action: "Add it",
    });
  }

  if (!settingUp && f.events.length === 0 && !festival) {
    tasks.push({
      key: "empty",
      title: "Nothing coming up on your page",
      detail:
        "Families see an empty page. Add your next event, or bring back one from last year.",
      href: "#add-event",
      action: "Add an event",
    });
  }

  return tasks;
}

// How many things a committee has to do, setup steps included, for the
// account page.
export function committeeTodoCount(f: CommitteeFacts): number {
  return committeeTasks(f).length + setupSteps(f).filter((s) => !s.done).length;
}

function daysUntil(f: CommitteeFacts, at: string): number {
  return daysBetween(f.today, londonDate(new Date(at)));
}
