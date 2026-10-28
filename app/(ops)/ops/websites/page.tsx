import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OpsNav } from "@/components/ops-nav";
import { Badge } from "@/components/public-shell";
import {
  buttonClass,
  Card,
  Loading,
  Notice,
  quietButtonClass,
} from "@/components/ui";
import { PageShell } from "@/components/page-shell";
import { requireToranAdmin } from "@/lib/auth";
import { formatEventStart, websiteLabel } from "@/lib/format";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { posterReadingOn } from "@/lib/poster-reader";
import { readFoundPatrika } from "../posters/actions";
import { checkNext, checkOne } from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Websites · Admin"),
  robots: { index: false },
};

// Checking reads other people's websites, which can be slow.
export const maxDuration = 60;

const OUTCOMES = {
  found: { label: "Events found", tone: "peacock" },
  none: { label: "No readable events", tone: "quiet" },
  blocked: { label: "Asks not to be read", tone: "marigold" },
  unreachable: { label: "Couldn't reach", tone: "kumkum" },
} as const;

type Outcome = keyof typeof OUTCOMES;

export default function OpsWebsitesPage(props: PageProps<"/ops/websites">) {
  return (
    <PageShell title="Websites" wide>
      <OpsNav current="/ops/websites" />
      <Suspense fallback={<Loading />}>
        <Websites {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Websites({ searchParams }: PageProps<"/ops/websites">) {
  await requireToranAdmin("/ops/websites");
  const supabase = await createSessionClient();
  const [{ data: mandirs }, { data: sources }] = supabase
    ? await Promise.all([
        supabase
          .from("mandirs")
          .select("id, slug, name, town, website")
          .not("website", "is", null)
          .neq("status", "hidden")
          .order("name"),
        supabase
          .from("sources")
          .select(
            "mandir_id, last_checked_at, last_outcome, last_found, last_notes, last_documents",
          )
          .eq("kind", "crawler"),
      ])
    : [{ data: [] }, { data: [] }];
  const checks = new Map((sources ?? []).map((s) => [s.mandir_id, s]));
  const rows = (mandirs ?? []).map((m) => ({ ...m, check: checks.get(m.id) }));

  const checked = rows.filter((r) => r.check?.last_checked_at);
  // Reading found patrikas needs the Anthropic key (docs/decisions/0018).
  const reading = posterReadingOn();
  const count = (outcome: Outcome) =>
    checked.filter((r) => r.check?.last_outcome === outcome).length;

  const query = await searchParams;
  const added = Number(query.added ?? 0);
  const outcome = String(query.outcome ?? "") as Outcome;
  const notice = query.error
    ? null
    : query.batch !== undefined
      ? `Checked ${query.batch} websites. ${added} new ${added === 1 ? "event" : "events"} added to the review queue.`
      : query.checked && outcome in OUTCOMES
        ? `${OUTCOMES[outcome].label}. ${added} new ${added === 1 ? "event" : "events"} added to the review queue.`
        : null;

  return (
    <>
      {query.error && (
        <Notice tone="error">
          {ERRORS[String(query.error)] ??
            "Something went wrong. Please try again."}
        </Notice>
      )}
      {notice && <Notice tone="success">{notice}</Notice>}

      <Card>
        <p>
          Reads each mandir&apos;s own website for events it publishes in a form
          Toran can read: event data in its pages, calendar feeds, Google
          Calendars shown on the site, WordPress&apos;s The Events Calendar, and
          the older hCalendar markup. It also lists the patrikas and posters
          (PDFs and pictures) a site links to, to type up, or to read with
          Claude when that&apos;s switched on. Names and descriptions are
          cleaned into plain text, times found in the description when the site
          gives none, and each event gets a likely type. Anything new goes to
          the{" "}
          <Link href="/ops/posters" className="text-peacock underline">
            review queue
          </Link>
          , for the committee or Toran to check before it&apos;s published. It
          obeys each site&apos;s robots.txt and never reads Facebook or
          Instagram.
        </p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="With a website" value={rows.length} />
          <Stat label="Checked" value={checked.length} />
          <Stat label="Events found" value={count("found")} />
          <Stat label="Nothing readable" value={count("none")} />
        </dl>
        <form action={checkNext}>
          <button type="submit" className={buttonClass}>
            Check the next 5 websites
          </button>
        </form>
        <p className="text-muted text-base">
          Starts with websites never checked, then the ones checked longest ago.
          Takes up to a minute, and stops early if sites are slow.
        </p>
      </Card>

      <ul className="border-line bg-surface divide-line shadow-card divide-y rounded-2xl border">
        {rows.map((r) => {
          const last = r.check?.last_outcome as Outcome | null | undefined;
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`/ops/mandirs/${r.slug}`}
                  className="text-peacock font-semibold"
                >
                  {r.name}
                </Link>
                <span className="text-muted text-base break-all">
                  {websiteLabel(r.website!)}
                  {r.check?.last_checked_at &&
                    ` · checked ${formatEventStart(r.check.last_checked_at, true)}`}
                </span>
                {r.check?.last_notes && (
                  <span className="text-muted text-base">
                    {r.check.last_notes.split("\n").join(" ")}
                  </span>
                )}
                {documentsOf(r.check?.last_documents).length > 0 && (
                  <ul
                    aria-label={`Patrikas and posters on ${r.name}'s website`}
                    className="flex flex-col gap-1 pt-1"
                  >
                    {documentsOf(r.check?.last_documents).map((d) => (
                      <li
                        key={d.url}
                        className="flex flex-wrap items-baseline gap-x-3"
                      >
                        <a
                          href={d.url}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="text-peacock font-semibold underline"
                        >
                          {d.kind === "pdf" ? "PDF" : "Picture"}: {d.label}
                        </a>
                        <Link
                          href={`/ops/posters?mandir=${encodeURIComponent(r.slug)}&source=website&link=${encodeURIComponent(d.url)}#type-up`}
                          className="text-peacock text-base underline"
                        >
                          Type it up
                          <span className="sr-only">: {d.label}</span>
                        </Link>
                        {reading && (
                          <form action={readFoundPatrika}>
                            <input type="hidden" name="mandir" value={r.slug} />
                            <input type="hidden" name="url" value={d.url} />
                            <button
                              type="submit"
                              className="text-peacock cursor-pointer text-base font-semibold underline"
                            >
                              Read it with Claude
                              <span className="sr-only">: {d.label}</span>
                            </button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {last && last in OUTCOMES && (
                <Badge tone={OUTCOMES[last].tone}>
                  {OUTCOMES[last].label}
                  {last === "found" && ` (${r.check?.last_found ?? 0})`}
                </Badge>
              )}
              <form action={checkOne}>
                <input type="hidden" name="mandir" value={r.slug} />
                <button
                  type="submit"
                  className={`${quietButtonClass} px-4 py-2 text-base`}
                  aria-label={`Check ${r.name}'s website`}
                >
                  Check
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// What went wrong reading a found patrika (readFoundPatrika).
const ERRORS: Record<string, string> = {
  readingOff:
    "Reading posters isn't switched on: it needs ANTHROPIC_API_KEY in Vercel's settings.",
  notFound:
    "That patrika isn't among the ones the last check found. Check the website again.",
  blocked: "The site's robots.txt asks robots not to read that file.",
  unreachable:
    "Couldn't fetch it: the site didn't answer, or the file is over 4 MB. Open it and send a smaller copy from the review queue.",
  documentType:
    "That file isn't a PDF or a picture Claude can read. Open it and type it up instead.",
  refused: "Claude wouldn't read that one. Please type it up instead.",
  readFailed: "Couldn't read it just now. Please try again in a minute.",
};

// The patrikas and posters saved with a check, ignoring anything malformed.
function documentsOf(
  value: unknown,
): { url: string; kind: string; label: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((d) =>
    d &&
    typeof d === "object" &&
    typeof d.url === "string" &&
    /^https?:\/\//.test(d.url)
      ? [
          {
            url: d.url,
            kind: d.kind === "pdf" ? "pdf" : "picture",
            label: typeof d.label === "string" && d.label ? d.label : d.url,
          },
        ]
      : [],
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-sunk rounded-xl p-3">
      <dt className="text-muted text-base">{label}</dt>
      <dd className="font-display text-4xl">{value}</dd>
    </div>
  );
}
