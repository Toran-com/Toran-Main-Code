import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OpsNav } from "@/components/ops-nav";
import { Badge } from "@/components/public-shell";
import {
  cardClass,
  Loading,
  Notice,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { keptApart, listedEvents } from "@/lib/duplicate-check";
import {
  type EventPair,
  eventPairs,
  type ListedEvent,
  mandirPairs,
} from "@/lib/duplicate-report";
import { clockLabel } from "@/lib/duplicates";
import { formatEventStart } from "@/lib/format";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { decidePair } from "./actions";

// Copies already on Toran, to clean up: events that are (or may be) the
// same at one mandir, and mandirs that may be listed twice. New copies are
// stopped as they arrive; this catches older ones.

export const metadata: Metadata = {
  title: pageTitle("Duplicates · Admin"),
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  seva: "The copy you chose to remove has a seva rota. Keep that one instead, or move its rota by hand first.",
  failed: "Something went wrong. Please try again.",
};

const DONE: Record<string, string> = {
  merged:
    "Merged. The one kept has anything only the other said, and the other is removed.",
  different: "Noted: they're different events, and won't be paired again.",
};

export default function OpsDuplicatesPage(props: PageProps<"/ops/duplicates">) {
  return (
    <PageShell title="Duplicates" wide>
      <OpsNav current="/ops/duplicates" />
      <Suspense fallback={<Loading />}>
        <Duplicates {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Duplicates({ searchParams }: PageProps<"/ops/duplicates">) {
  await requireToranAdmin("/ops/duplicates");
  const query = await searchParams;
  const supabase = await createSessionClient();
  const { data: mandirs, error } = supabase
    ? await supabase
        .from("mandirs")
        .select("id, slug, name, town, postcode")
        .neq("status", "hidden")
        .order("name")
    : { data: null, error: true };
  if (!supabase || error || !mandirs) {
    return <Notice tone="error">Couldn&apos;t load the list.</Notice>;
  }

  const listed = await listedEvents(
    supabase,
    mandirs.map((m) => m.id),
  );
  const ids = [...listed.values()].flat().map((e) => e.id);
  const apart = await keptApart(supabase, ids);
  const groups = mandirs.flatMap((m) => {
    const pairs = eventPairs(listed.get(m.id) ?? [], apart);
    return pairs.length ? [{ mandir: m, pairs }] : [];
  });
  const total = groups.reduce((n, g) => n + g.pairs.length, 0);
  const places = mandirPairs(mandirs);

  return (
    <>
      <p className="text-muted">
        New copies are stopped as they arrive. This lists the ones already on
        Toran: events at one mandir that are, or may be, the same (from today
        on), and mandirs that may be listed twice.
      </p>
      {ERRORS[String(query.error ?? "")] && (
        <Notice tone="error">{ERRORS[String(query.error)]}</Notice>
      )}
      {DONE[String(query.done ?? "")] && (
        <Notice tone="success">{DONE[String(query.done)]}</Notice>
      )}

      <section aria-labelledby="events" className="flex flex-col gap-4">
        <h2 id="events" className="text-2xl font-bold">
          {total
            ? `${total} possible ${total === 1 ? "copy" : "copies"} of events`
            : "No copies of events"}
        </h2>
        {groups.map(({ mandir, pairs }) => (
          <div
            key={mandir.id}
            className={`${cardClass} flex flex-col gap-4 p-5 sm:p-6`}
          >
            <h3 className="text-xl font-semibold">
              <Link
                href={`/mandirs/${mandir.slug}`}
                className="text-peacock underline"
              >
                {mandir.name}
              </Link>
              , {mandir.town}
            </h3>
            <ul className="flex flex-col gap-4">
              {pairs.map((pair) => (
                <Pair
                  key={`${pair.a.id}|${pair.b.id}`}
                  slug={mandir.slug}
                  pair={pair}
                />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="mandirs" className="flex flex-col gap-4">
        <h2 id="mandirs" className="text-2xl font-bold">
          {places.length
            ? `${places.length} ${places.length === 1 ? "mandir" : "mandirs"} that may be listed twice`
            : "No mandirs listed twice"}
        </h2>
        {places.length > 0 && (
          <ul className="divide-line border-line flex flex-col divide-y border-y">
            {places.map(({ a, b, why }) => (
              <li key={`${a.id}|${b.id}`} className="flex flex-col gap-1 py-3">
                <p>
                  <Link
                    href={`/mandirs/${a.slug}`}
                    className="text-peacock font-semibold underline"
                  >
                    {a.name}
                  </Link>{" "}
                  and{" "}
                  <Link
                    href={`/mandirs/${b.slug}`}
                    className="text-peacock font-semibold underline"
                  >
                    {b.name}
                  </Link>
                  , {a.town}
                </p>
                <p className="text-muted text-base">
                  {why === "postcode"
                    ? `Both at ${a.postcode}.`
                    : "Nearly the same name in the same town."}{" "}
                  If they&apos;re one mandir, hide one on{" "}
                  <Link href="/ops/mandirs" className="text-peacock underline">
                    Mandirs
                  </Link>{" "}
                  and move its events across.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Pair({ slug, pair }: { slug: string; pair: EventPair }) {
  const one = (e: ListedEvent) => (
    <Link
      href={`/manage/${slug}/events/${e.id}`}
      className="text-peacock font-semibold underline"
    >
      {e.title}
    </Link>
  );
  const when = (e: ListedEvent) => clockLabel(e.time);
  const keep = (k: ListedEvent, o: ListedEvent) => (
    <form action={decidePair}>
      <input type="hidden" name="keep" value={k.id} />
      <input type="hidden" name="other" value={o.id} />
      <button
        type="submit"
        name="decision"
        value="merge"
        className={`${quietButtonClass} px-4 py-2 text-base`}
      >
        Keep &ldquo;{k.title}&rdquo;
      </button>
    </form>
  );
  return (
    <li className="border-line flex flex-col gap-3 rounded-2xl border p-4">
      <p className="flex flex-wrap items-center gap-2">
        <Badge tone={pair.verdict === "same" ? "kumkum" : "marigold"}>
          {pair.verdict === "same" ? "Same event" : "Maybe the same"}
        </Badge>
        <span className="text-muted">
          {formatEventStart(`${pair.date}T12:00:00Z`, true)}
        </span>
      </p>
      <ul className="flex flex-col gap-1">
        <li>
          {one(pair.a)}, {when(pair.a)}
        </li>
        <li>
          {one(pair.b)}, {when(pair.b)}
        </li>
      </ul>
      <div className="flex flex-wrap gap-2">
        {keep(pair.a, pair.b)}
        {keep(pair.b, pair.a)}
        <form action={decidePair}>
          <input type="hidden" name="keep" value={pair.a.id} />
          <input type="hidden" name="other" value={pair.b.id} />
          <button
            type="submit"
            name="decision"
            value="different"
            className="text-peacock cursor-pointer px-2 py-2 text-base font-semibold underline"
          >
            They&apos;re different events
          </button>
        </form>
      </div>
    </li>
  );
}
