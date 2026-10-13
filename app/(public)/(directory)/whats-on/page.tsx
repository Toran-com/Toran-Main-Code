import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventList, POSTCODE_CREDIT } from "@/components/event-list";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { buttonClass, inputClass, Loading, Notice } from "@/components/ui";
import { REGIONS } from "@/lib/mandir-form";
import { pageTitle } from "@/lib/site";
import { listUpcomingEvents, positionForSearch } from "@/lib/whats-on";
import { nearTo, RADII, radiusFrom } from "@/lib/whats-on-view";

export const metadata: Metadata = {
  title: pageTitle("What's on"),
  description:
    "Events at Hindu mandirs across the UK in the next eight weeks: festivals, aarti, bhajans, classes and more.",
};

export default function WhatsOnPage(props: PageProps<"/whats-on">) {
  return (
    <>
      <PageHeading
        title="What's on"
        intro="Events at mandirs across the UK in the next eight weeks. Type your postcode to see what's near you."
      />
      <Suspense fallback={<Loading />}>
        <WhatsOn {...props} />
      </Suspense>
    </>
  );
}

async function WhatsOn({ searchParams }: PageProps<"/whats-on">) {
  const query = await searchParams;
  // The list says "Today" and "Tomorrow", so it's worked out per visit,
  // never ahead of time (for example when a link to it is prefetched).
  await connection();
  const near = String(query.near ?? "")
    .trim()
    .slice(0, 10);
  const within = radiusFrom(query.within);
  const region = String(query.region ?? "");

  const [result, origin] = await Promise.all([
    listUpcomingEvents(),
    near ? positionForSearch(near) : Promise.resolve(null),
  ]);

  const form = (
    <form className="border-line bg-surface grid gap-4 rounded-2xl border p-5 sm:grid-cols-[2fr_1fr_1.5fr_auto] sm:items-end">
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Your postcode or area</span>
        <input
          name="near"
          defaultValue={near}
          placeholder="e.g. HA9 or LE4 6AR"
          autoComplete="postal-code"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Within</span>
        <select
          name="within"
          defaultValue={String(within)}
          className={inputClass}
        >
          {RADII.map((r) => (
            <option key={r} value={r}>
              {r} miles
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Region</span>
        <select name="region" defaultValue={region} className={inputClass}>
          <option value="">Anywhere</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <button type="submit" className={`${buttonClass} sm:w-auto`}>
        Show
      </button>
    </form>
  );

  if (result.state !== "ok") {
    return (
      <>
        {form}
        <LoadProblem state={result.state} what="event list" />
      </>
    );
  }

  let problem: string | null = null;
  let position = null;
  if (near && origin === "unavailable") {
    problem =
      "We couldn't look up that postcode just now, so all events are shown.";
  } else if (near && !origin) {
    problem = `We couldn't find "${near}". Try a full postcode like LE4 6AR, or just the first part like LE4.`;
  } else if (origin && origin !== "unavailable") {
    position = origin;
  }

  const inRegion = region
    ? result.data.filter((e) => e.mandir.region === region)
    : result.data;
  const events = nearTo(inRegion, position, within);

  return (
    <>
      {form}
      {problem && <Notice tone="error">{problem}</Notice>}
      {events.length ? (
        <>
          <p className="text-muted" aria-live="polite">
            {events.length} {events.length === 1 ? "event" : "events"}
            {position && ` within ${within} miles of ${near.toUpperCase()}`}
            {region && ` in ${region}`}
          </p>
          <EventList events={events} now={new Date()} />
        </>
      ) : (
        <div className="bg-sunk flex flex-col gap-2 rounded-2xl p-5">
          <p className="font-semibold">
            {position || region
              ? "No events listed there in the next eight weeks."
              : "No events listed yet."}
          </p>
          <p className="text-muted">
            Mandirs are adding their events as they join Toran. In the meantime,
            find your nearest mandir on the{" "}
            <Link href="/mandirs" className="text-peacock underline">
              mandir list
            </Link>
            .
          </p>
        </div>
      )}
      {position && <p className="text-muted text-base">{POSTCODE_CREDIT}</p>}
    </>
  );
}
