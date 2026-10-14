import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventFields } from "@/components/event-fields";
import { OpsNav } from "@/components/ops-nav";
import { PosterDetails } from "@/components/poster-details";
import { Badge } from "@/components/public-shell";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { EVENT_ERRORS } from "@/lib/event-form";
import { pageTitle } from "@/lib/site";
import { POSTER_SOURCES, posterFrom } from "@/lib/posters";
import { createSessionClient } from "@/lib/supabase/session";
import { addPoster, reviewPosterAsToran } from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Posters · Admin"),
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  ...EVENT_ERRORS,
  mandir: "Please choose the mandir.",
  from: "Please say where the poster came from.",
  link: "Please give a full web address starting https://, or leave it empty.",
  claimed:
    "That mandir has a committee, so they publish it. It's waiting on their page.",
  done: "Someone has already dealt with that poster.",
  failed: "Something went wrong. Please try again.",
};

const DONE: Record<string, string> = {
  published: "Published. It's on the mandir's page now.",
  discarded: "Discarded.",
};

export default function OpsPostersPage(props: PageProps<"/ops/posters">) {
  return (
    <PageShell title="Forwarded posters" wide>
      <OpsNav current="/ops/posters" />
      <Suspense fallback={<Loading />}>
        <Posters {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Posters({ searchParams }: PageProps<"/ops/posters">) {
  await requireToranAdmin("/ops/posters");
  const supabase = await createSessionClient();
  const [{ data: mandirs }, { data: claims }] = supabase
    ? await Promise.all([
        supabase
          .from("mandirs")
          .select("slug, name, town")
          .neq("status", "hidden")
          .order("name"),
        supabase
          .from("event_claims")
          .select(
            "id, proposed, created_at, mandir:mandirs (slug, name, town, status)",
          )
          .eq("status", "pending")
          .order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];
  const query = await searchParams;
  const error = ERRORS[String(query.error ?? "")];
  const done = query.added
    ? "Added to the queue."
    : DONE[String(query.done ?? "")];
  const chosen = String(query.mandir ?? "");

  const waiting = (claims ?? []).flatMap((c) => {
    const poster = posterFrom(c.proposed);
    return poster && c.mandir ? [{ ...c, mandir: c.mandir, poster }] : [];
  });

  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      <Card>
        <h2 className="text-2xl font-bold">Type up a poster</h2>
        <p className="text-muted">
          Copy the event details from a poster or message someone forwarded.
          Only the event: never the name or number of whoever sent it. The
          mandir&apos;s committee then publishes it from their page.
        </p>
        <form action={addPoster} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Mandir</span>
            <select
              name="mandir"
              required
              defaultValue={chosen}
              className={inputClass}
            >
              <option value="" disabled>
                Choose a mandir
              </option>
              {(mandirs ?? []).map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}, {m.town}
                </option>
              ))}
            </select>
          </label>
          <EventFields />
          <label className="flex flex-col gap-2">
            <span className="font-semibold">
              Link for more details (optional)
            </span>
            <input
              name="link"
              type="url"
              maxLength={300}
              placeholder="https://"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Where it came from</span>
            <select
              name="from"
              required
              defaultValue="whatsapp"
              className={inputClass}
            >
              {Object.entries(POSTER_SOURCES)
                .filter(([key]) => key !== "visitor")
                .map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" className={buttonClass}>
            Add to the queue
          </button>
        </form>
      </Card>

      <section aria-labelledby="waiting" className="flex flex-col gap-3">
        <h2 id="waiting" className="text-2xl font-bold">
          Waiting ({waiting.length})
        </h2>
        {waiting.length === 0 && <p className="text-muted">Nothing waiting.</p>}
        <ul className="flex flex-col gap-3">
          {waiting.map((c) => {
            const hasCommittee = c.mandir.status === "claimed";
            return (
              <li
                key={c.id}
                className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/mandirs/${c.mandir.slug}`}
                    className="text-peacock font-semibold underline"
                  >
                    {c.mandir.name}, {c.mandir.town}
                  </Link>
                  {hasCommittee ? (
                    <Badge tone="peacock">Waiting for the committee</Badge>
                  ) : (
                    <Badge tone="marigold">No committee yet</Badge>
                  )}
                </div>
                <PosterDetails poster={c.poster} />
                <form
                  action={reviewPosterAsToran}
                  className="flex flex-wrap gap-2"
                >
                  <input type="hidden" name="poster" value={c.id} />
                  {!hasCommittee && (
                    <button
                      type="submit"
                      name="decision"
                      value="publish"
                      className={`${buttonClass} px-4 py-2 text-base`}
                    >
                      Publish
                    </button>
                  )}
                  <button
                    type="submit"
                    name="decision"
                    value="discard"
                    className={`${quietButtonClass} px-4 py-2 text-base`}
                  >
                    Discard
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
