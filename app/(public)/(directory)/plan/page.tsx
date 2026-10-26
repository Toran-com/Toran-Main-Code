import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventCard } from "@/components/event-list";
import { WhatsAppIcon } from "@/components/icons";
import { PlanButtons, PlanFromPhone, RemoveFromPlan } from "@/components/plan";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { Loading } from "@/components/ui";
import { formatEventStart } from "@/lib/format";
import { localePath, pageLocale, pageT } from "@/lib/i18n/page";
import { cleanEventIds, planHref } from "@/lib/plan";
import { eventPath } from "@/lib/share";
import { pageMetadata, siteUrl } from "@/lib/site";
import { listEventsById } from "@/lib/whats-on";
import { groupByDay } from "@/lib/whats-on-view";

// A family's plan: the events picked on a phone (lib/plan.ts), listed by
// day, and sent to the family in one WhatsApp message. The events are in
// the address (?events=…), so anyone sent the link sees the same plan.

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return {
    ...pageMetadata(
      t("plan.title"),
      t("plan.description"),
      localePath("/plan"),
    ),
    // Someone's plan isn't for search engines.
    robots: { index: false, follow: true },
  };
}

export default function PlanPage(props: PageProps<"/plan">) {
  const t = pageT();
  return (
    <div className="page-wide flex flex-col gap-8 sm:gap-10">
      <PageHeading title={t("plan.title")} intro={t("plan.intro")} />
      <Suspense fallback={<Loading />}>
        <Plan {...props} />
      </Suspense>
    </div>
  );
}

async function Plan({ searchParams }: PageProps<"/plan">) {
  const t = pageT();
  const ids = cleanEventIds((await searchParams).events);
  if (!ids.length) return <PlanFromPhone />;
  // "Today" and "Tomorrow" in the headings are worked out per visit.
  await connection();
  const result = await listEventsById(ids);
  if (result.state !== "ok") {
    return <LoadProblem state={result.state} what={t("load.eventList")} />;
  }
  const events = result.data.map((e) => ({ ...e, miles: null }));
  const shown = events.map((e) => e.id);
  const notShown = ids.length - events.length;

  // One message for the family: each event, when and where, with its
  // page, then the whole plan.
  const message = [
    t("plan.messageTitle"),
    ...events.map(
      (e) =>
        `${formatEventStart(e.next_starts_at, e.all_day)}: ${e.title}, ${e.mandir.name}, ${e.mandir.town}\n${siteUrl()}${localePath(eventPath(e.mandir.slug, e.id))}`,
    ),
    `${t("plan.messageLink")} ${siteUrl()}${planHref(pageLocale(), shown)}`,
  ].join("\n\n");

  return (
    <>
      {events.length > 0 && (
        <div className="flex flex-col gap-4">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener"
            className="bg-peacock text-on-peacock hover:bg-peacock-deep flex min-h-14 w-full max-w-md items-center justify-center gap-3 rounded-full px-6 py-3 text-lg font-semibold no-underline transition active:scale-[0.98] [&_svg]:size-6"
          >
            <WhatsAppIcon />
            {t("plan.send")}
          </a>
          <PlanButtons
            events={events.map((e) => ({ id: e.id, at: e.next_starts_at }))}
          />
        </div>
      )}
      {events.length === 0 && <PlanFromPhone />}
      <div className="flex flex-col gap-8 sm:gap-10">
        {groupByDay(events, new Date()).map(({ day, heading, events: all }) => (
          <section key={day} className="flex flex-col">
            <h2 className="text-marigold-ink text-base font-semibold tracking-[0.12em] uppercase">
              {heading}
            </h2>
            <ul className="divide-line flex flex-col divide-y">
              {all.map((e) => (
                <li key={e.id} className="flex flex-col pb-4">
                  <EventCard event={e} />
                  <RemoveFromPlan id={e.id} shown={shown} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {notShown > 0 && (
        <p className="text-muted">{t("plan.notShown", { count: notShown })}</p>
      )}
    </>
  );
}
