import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { OpsNav } from "@/components/ops-nav";
import {
  cardClass,
  Loading,
  Notice,
  PageShell,
  pillButtonClass,
} from "@/components/ui";
import {
  attentionCount,
  daysSince,
  nightlyStatus,
  readAttention,
  type List,
} from "@/lib/attention";
import { requireToranAdmin } from "@/lib/auth";
import { CORRECTION_KINDS } from "@/lib/corrections";
import { calendarLabel, formatEventStart } from "@/lib/format";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { markRequestDone } from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Needs attention · Admin"),
  robots: { index: false },
};

export default function OpsAttentionPage() {
  return (
    <PageShell title="Needs attention" wide>
      <OpsNav current="/ops/attention" />
      <Suspense fallback={<Loading />}>
        <NeedsAttention />
      </Suspense>
    </PageShell>
  );
}

const WEBSITE_OUTCOMES: Record<string, string> = {
  blocked: "Blocked by robots.txt",
  unreachable: "Couldn't reach the site",
};

async function NeedsAttention() {
  await requireToranAdmin("/ops/attention");
  const supabase = await createSessionClient();
  const [answer, lastRun] = supabase
    ? await Promise.all([
        supabase.rpc("needs_attention"),
        supabase
          .from("job_runs")
          .select("ran_at, summary")
          .eq("job", "nightly")
          .order("ran_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
    : [null, null];
  if (!answer || answer.error) {
    return <Notice tone="error">Couldn&apos;t load the list.</Notice>;
  }
  const a = readAttention(answer.data);
  const total = attentionCount(a);
  const now = new Date();
  const nightly = nightlyStatus(lastRun?.data ?? null, now);

  return (
    <>
      <p className="text-muted">
        Everything worth following up, in one place: events nobody has checked
        lately, committees gone quiet, websites the checker can&apos;t read, and
        things left waiting. Each list shows the first 50.
      </p>
      {nightly.state === "never" ? (
        <Notice tone="error">
          The nightly job hasn&apos;t run yet. It needs CRON_SECRET and
          SUPABASE_SECRET_KEY set in Vercel (see &ldquo;Nightly job&rdquo; in
          docs/app-setup.md).
        </Notice>
      ) : nightly.state === "late" ? (
        <Notice tone="error">
          The nightly job last ran {formatEventStart(nightly.ranAt, false)}. It
          should run every night: check Vercel&apos;s Cron Jobs page.
        </Notice>
      ) : (
        <p className="text-muted text-base">
          Nightly job last ran {formatEventStart(nightly.ranAt, false)}:{" "}
          {nightly.text}.
        </p>
      )}
      {total === 0 && (
        <Notice tone="success">Nothing needs attention. All clear.</Notice>
      )}

      <nav aria-label="Lists" className="flex flex-wrap gap-2">
        {SECTIONS.map(({ id, title }) => (
          <a
            key={id}
            href={`#${id}`}
            className="border-line hover:bg-sunk rounded-full border px-4 py-1.5 text-base font-semibold"
          >
            {title} ({a[id].total})
          </a>
        ))}
      </nav>

      <Section
        id="unconfirmed"
        list={a.unconfirmed}
        intro="Events in the next 30 days that the mandir hasn't confirmed in the last 30 days. Ask the committee to press “Still on”, or check with the mandir."
        empty="Every event coming up has been confirmed lately."
        more={{ href: "/ops/mandirs", label: "All mandirs" }}
        render={(e) => (
          <>
            <Mandir {...e} href={`/ops/mandirs/${e.slug}`} />
            <span>
              <strong>{e.title}</strong>, {formatEventStart(e.next_at, false)}
            </span>
            <span className="text-muted text-base">
              {e.confirmed_at
                ? `Last confirmed ${daysSince(e.confirmed_at, now)} days ago`
                : "Never confirmed"}
              {!e.has_committee && " · No committee on Toran yet"}
            </span>
          </>
        )}
      />

      <Section
        id="quiet"
        list={a.quiet}
        intro="Mandirs with a committee on Toran but nothing coming up. A friendly nudge, or a festival to add, often helps."
        empty="Every committee has something coming up."
        render={(m) => (
          <>
            <Mandir {...m} href={`/ops/mandirs/${m.slug}`} />
            <span className="text-muted text-base">
              {m.last_added
                ? `Last added an event ${daysSince(m.last_added, now)} days ago`
                : "Hasn't added an event yet"}
            </span>
          </>
        )}
      />

      <Section
        id="websites"
        list={a.websites}
        intro="Mandir websites the checker couldn't read last time. Check the address is right, or look at the site by hand."
        empty="The checker could read every website it tried."
        more={{ href: "/ops/websites", label: "Website checker" }}
        render={(w) => (
          <>
            <Mandir {...w} href={`/ops/mandirs/${w.slug}`} />
            <span>
              {WEBSITE_OUTCOMES[w.outcome] ?? w.outcome}, checked{" "}
              {formatEventStart(w.checked_at, true)}
            </span>
            {w.notes && <span className="text-muted text-base">{w.notes}</span>}
          </>
        )}
      />

      <Section
        id="invites"
        list={a.invites}
        intro="Committee invites that run out in the next 3 days. The committee can send a new one once it does."
        empty="No invites are about to run out."
        render={(i) => (
          <>
            <Mandir {...i} href={`/ops/mandirs/${i.slug}`} />
            <span className="text-muted text-base">
              Runs out {formatEventStart(i.expires_at, false)}
            </span>
          </>
        )}
      />

      <Section
        id="festival_dates"
        list={a.festival_dates}
        intro="Festival dates in the next 60 days not yet checked against a panchang. They show “Date may vary: check with your mandir” on the public site."
        empty="Every festival date in the next 60 days is checked."
        more={{ href: "/ops/festivals", label: "Festival dates" }}
        render={(d) => (
          <>
            <strong>{d.name}</strong>
            <span>
              {formatEventStart(`${d.starts_on}T12:00:00Z`, true)}
              {calendarLabel(d.calendar) && ` · ${calendarLabel(d.calendar)}`}
            </span>
          </>
        )}
      />

      <Section
        id="posters"
        list={a.posters}
        intro="Mandirs with posters waiting more than 3 days. Where there's no committee on Toran, Toran checks them."
        empty="No posters have been waiting long."
        more={{ href: "/ops/posters", label: "Review queue" }}
        render={(p) => (
          <>
            <Mandir {...p} href={`/ops/mandirs/${p.slug}`} />
            <span>
              {p.waiting} waiting, the oldest for {daysSince(p.oldest, now)}{" "}
              days
            </span>
            <span className="text-muted text-base">
              {p.has_committee
                ? "Waiting for the committee"
                : "No committee on Toran yet"}
            </span>
          </>
        )}
      />

      <Section
        id="claims"
        list={a.claims}
        intro="Requests to look after a mandir's page waiting more than 2 days."
        empty="No requests have been waiting long."
        more={{ href: "/ops", label: "Check requests" }}
        render={(c) => (
          <>
            <Mandir {...c} href={`/ops/mandirs/${c.slug}`} />
            <span className="text-muted text-base">
              Asked {daysSince(c.created_at, now)} days ago
            </span>
          </>
        )}
      />

      <Section
        id="requests"
        list={a.requests}
        intro="Sent with the “Correct or remove something” form. Removals are promised the same day. Mark each one done when it's dealt with."
        empty="No requests waiting."
        render={(r) => (
          <>
            <span className="font-semibold">
              {CORRECTION_KINDS.find((k) => k.value === r.kind)?.label ??
                r.kind}
            </span>
            <Link href={r.page} className="text-peacock self-start break-all">
              {r.page}
            </Link>
            <span className="whitespace-pre-line">{r.details}</span>
            <span className="text-muted text-base">
              Sent {formatEventStart(r.created_at, false)}
            </span>
            <form action={markRequestDone} className="pt-1">
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className={pillButtonClass}>
                Done
              </button>
            </form>
          </>
        )}
      />
    </>
  );
}

const SECTIONS = [
  { id: "unconfirmed", title: "Not confirmed lately" },
  { id: "quiet", title: "Nothing coming up" },
  { id: "websites", title: "Websites not read" },
  { id: "invites", title: "Invites running out" },
  { id: "festival_dates", title: "Festival dates to check" },
  { id: "posters", title: "Posters waiting long" },
  { id: "claims", title: "Committee requests waiting" },
  { id: "requests", title: "Corrections and removals" },
] as const;

function Section<T>({
  id,
  list,
  intro,
  empty,
  more,
  render,
}: {
  id: (typeof SECTIONS)[number]["id"];
  list: List<T>;
  intro: string;
  empty: string;
  more?: { href: string; label: string };
  render: (item: T) => ReactNode;
}) {
  const title = SECTIONS.find((s) => s.id === id)!.title;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`${cardClass} flex scroll-mt-24 flex-col gap-3 p-5 sm:p-6`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="text-xl font-bold sm:text-2xl">
          {title}{" "}
          <span
            className={`ml-1 rounded-full px-2.5 py-0.5 text-base ${
              list.total
                ? "bg-marigold/15 text-marigold-ink"
                : "bg-sunk text-muted"
            }`}
          >
            {list.total}
          </span>
        </h2>
        {more && (
          <Link href={more.href} className="text-peacock font-semibold">
            {more.label} →
          </Link>
        )}
      </div>
      <p className="text-muted">{intro}</p>
      {list.items.length ? (
        <ul className="divide-line flex flex-col divide-y">
          {list.items.map((item, i) => (
            <li key={i} className="flex flex-col gap-0.5 py-2.5">
              {render(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-semibold">✓ {empty}</p>
      )}
      {list.total > list.items.length && (
        <p className="text-muted text-base">
          And {list.total - list.items.length} more.
        </p>
      )}
    </section>
  );
}

function Mandir({
  name,
  town,
  href,
}: {
  name: string;
  town: string;
  href: string;
}) {
  return (
    <Link href={href} className="text-peacock self-start font-semibold">
      {name}
      {town && `, ${town}`}
    </Link>
  );
}
