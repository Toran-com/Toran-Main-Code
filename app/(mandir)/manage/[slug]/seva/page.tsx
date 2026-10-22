import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CopyText } from "@/components/copy-text";
import { Badge } from "@/components/public-shell";
import {
  Card,
  Loading,
  PageShell,
  pillButtonClass,
  quietButtonClass,
} from "@/components/ui";
import { upcomingFilter, withNextStart } from "@/lib/events";
import { formatEventStart, londonDate } from "@/lib/format";
import { requireMandirAccess } from "@/lib/manage-access";
import { placesTaken, sevaRoundup, shiftLabel, stillShort } from "@/lib/seva";
import { sevaPath } from "@/lib/share";
import { pageTitle, siteUrl } from "@/lib/site";

// The committee's seva at a glance: every coming event's rota, what's
// still short, and one message for the volunteers' WhatsApp group. Each
// rota is planned on its own page (./[event]). Numbers only: Toran never
// keeps a volunteer's name (decision 0013).

export const metadata: Metadata = {
  title: pageTitle("Seva"),
  robots: { index: false },
};

export default function SevaOverviewPage(
  props: PageProps<"/manage/[slug]/seva">,
) {
  return (
    <PageShell title="Seva">
      <Suspense fallback={<Loading />}>
        <Overview {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Overview({ params }: PageProps<"/manage/[slug]/seva">) {
  const { slug } = await params;
  const { supabase, mandir } = await requireMandirAccess(
    slug,
    `/manage/${slug}/seva`,
  );
  // What's short depends on the time now.
  await connection();
  const now = new Date();

  const from = `${londonDate()}T00:00:00Z`;
  const { data: rows } = await supabase
    .from("events")
    .select(
      "id, title, starts_at, all_day, recurrence, status, seva_open, event_occurrences (starts_at, cancelled), seva_roles (name, description, needs_dbs, created_at, seva_shifts (starts_at, ends_at, needed, filled_offline, taken_online))",
    )
    .eq("mandir_id", mandir.id)
    .in("status", ["published", "draft"])
    .or(upcomingFilter(from))
    .order("starts_at")
    .limit(100);

  const events = withNextStart(rows ?? [], from)
    .sort((a, b) => a.next_starts_at.localeCompare(b.next_starts_at))
    .map((e) => {
      const rota = [...e.seva_roles]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((r) => ({ ...r, shifts: r.seva_shifts }));
      const shifts = rota.flatMap((r) => r.shifts);
      return {
        ...e,
        when: formatEventStart(e.next_starts_at, e.all_day),
        rota,
        needed: shifts.reduce((sum, s) => sum + s.needed, 0),
        taken: shifts.reduce((sum, s) => sum + placesTaken(s), 0),
        short: stillShort(rota, now),
      };
    });
  const planned = events.filter((e) => e.rota.length);
  const unplanned = events.filter(
    (e) => !e.rota.length && e.status === "published",
  );
  const shortShifts = planned.reduce((sum, e) => sum + e.short.length, 0);
  const message = sevaRoundup(
    mandir.name,
    planned.map((e) => ({
      title: e.title,
      when: e.when,
      link:
        e.seva_open && e.status === "published"
          ? `${siteUrl()}${sevaPath(mandir.slug, e.id)}`
          : null,
      short: e.short,
    })),
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={`/manage/${mandir.slug}`}
          className="text-peacock self-start font-semibold"
        >
          ← {mandir.name}
        </Link>
        <p className="text-muted">
          Every rota for your coming events, and what&apos;s still short. Plan
          each rota on its own page; when you turn on online sign-up, the event
          also shows on Toran&apos;s{" "}
          <Link href="/seva" className="text-peacock underline">
            Seva page
          </Link>
          , where volunteers near you can find it.
        </p>
      </div>

      {planned.length ? (
        <section aria-labelledby="rotas" className="flex flex-col gap-4">
          <h2 id="rotas" className="text-xl font-bold sm:text-2xl">
            {shortShifts
              ? `${shortShifts} ${shortShifts === 1 ? "shift" : "shifts"} still short`
              : "Every shift is filled"}
          </h2>
          <ul className="flex flex-col gap-4">
            {planned.map((e) => (
              <li key={e.id}>
                <Card>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="text-lg font-semibold sm:text-xl">
                      {e.title}
                    </h3>
                    <span className="text-marigold-ink font-semibold">
                      {e.when}
                    </span>
                  </div>
                  <p className="flex flex-wrap items-center gap-2">
                    <Badge tone={e.short.length ? "marigold" : "leaf"}>
                      {e.taken} of {e.needed} places filled
                    </Badge>
                    {e.status === "draft" ? (
                      <Badge>Not published yet</Badge>
                    ) : e.seva_open ? (
                      <Badge tone="peacock">Online sign-up on</Badge>
                    ) : (
                      <Badge>Online sign-up off</Badge>
                    )}
                  </p>
                  {e.short.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {e.short.map((s) => (
                        <li key={`${s.role}-${s.startsAt}`}>
                          <span className="font-semibold">{s.role}</span>
                          {s.needsDbs && " (DBS check needed)"},{" "}
                          {shiftLabel(s.startsAt, s.endsAt)}:{" "}
                          <span className="text-marigold-ink font-semibold">
                            {s.short} still needed
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={`/manage/${mandir.slug}/seva/${e.id}`}
                    className={`${pillButtonClass} self-start`}
                  >
                    Plan this rota
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <Card>
          <h2 className="text-xl font-bold sm:text-2xl">No rotas yet</h2>
          <p className="text-muted">
            Choose an event below and add the roles it needs (Kitchen, Parking,
            Shoes) and their shifts. Then send the rota to your volunteers, or
            let them take a slot on Toran.
          </p>
        </Card>
      )}

      {shortShifts > 0 && (
        <Card>
          <h2 className="text-xl font-bold sm:text-2xl">
            One message for your volunteers
          </h2>
          <p className="text-muted">
            Everything still short, ready for your volunteers&apos; WhatsApp
            group.
          </p>
          <p className="bg-sunk rounded-2xl p-4 whitespace-pre-line">
            {message}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              className={quietButtonClass}
            >
              Send on WhatsApp
            </a>
            <CopyText text={message} label="Copy the message" />
          </div>
        </Card>
      )}

      {unplanned.length > 0 && (
        <section aria-labelledby="unplanned" className="flex flex-col gap-3">
          <h2 id="unplanned" className="text-xl font-bold sm:text-2xl">
            Events without a rota
          </h2>
          <ul className="divide-line border-line flex flex-col divide-y border-y">
            {unplanned.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
              >
                <span>
                  <span className="font-semibold">{e.title}</span>{" "}
                  <span className="text-muted">{e.when}</span>
                </span>
                <Link
                  href={`/manage/${mandir.slug}/seva/${e.id}`}
                  className="text-peacock font-semibold"
                >
                  Plan seva →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
