import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CopyText } from "@/components/copy-text";
import { OpsNav } from "@/components/ops-nav";
import { Badge, LoadProblem } from "@/components/public-shell";
import {
  Card,
  inputClass,
  Loading,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { buildDigest, digestText, eventTime } from "@/lib/digest";
import { listFestivalDates } from "@/lib/directory";
import { formatDateRange } from "@/lib/format";
import { REGIONS } from "@/lib/mandir-form";
import { pageTitle, siteUrl } from "@/lib/site";
import { listUpcomingEvents } from "@/lib/whats-on";

export const metadata: Metadata = {
  title: pageTitle("Digest preview · Admin"),
  robots: { index: false },
};

export default function OpsDigestPage(props: PageProps<"/ops/digest">) {
  return (
    <PageShell title="Weekly digest" wide>
      <OpsNav current="/ops/digest" />
      <Suspense fallback={<Loading />}>
        <DigestPreview {...props} />
      </Suspense>
    </PageShell>
  );
}

async function DigestPreview({ searchParams }: PageProps<"/ops/digest">) {
  await requireToranAdmin("/ops/digest");
  const query = await searchParams;
  const region = REGIONS.find((r) => r === query.region) ?? null;
  // "This week" depends on today, so work it out per visit.
  await connection();
  const [events, dates] = await Promise.all([
    listUpcomingEvents(),
    listFestivalDates(),
  ]);
  if (events.state !== "ok") {
    return <LoadProblem state={events.state} what="event list" />;
  }
  const digest = buildDigest(
    events.data,
    dates.state === "ok" ? dates.data : [],
    new Date(),
    region,
  );
  const text = digestText(digest, siteUrl());

  return (
    <>
      <p className="text-muted">
        A preview of the weekly email. Nobody receives it yet: there&apos;s no
        sign-up or subscriber list until Toran is registered with the ICO and
        the privacy assessment is done (decision 0006). You can copy the text to
        try it out by hand.
      </p>
      <form className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold">Region</span>
          <select
            name="region"
            defaultValue={region ?? ""}
            className={inputClass}
          >
            <option value="">All of the UK</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className={`${quietButtonClass} px-4 py-2 text-base`}
        >
          Show
        </button>
      </form>

      <Card>
        <p className="text-muted text-base">Email preview</p>
        <h2 className="font-display text-3xl font-bold">
          What&apos;s on at mandirs
        </h2>
        <p className="text-marigold-ink font-semibold">
          {formatDateRange(digest.start, digest.end)}
          {region && ` · ${region}`} · {digest.count}{" "}
          {digest.count === 1 ? "event" : "events"}
        </p>
        {digest.festivals.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xl font-bold">Festivals coming up</h3>
            <ul className="flex flex-col gap-1">
              {digest.festivals.map((f) => (
                <li key={f.slug} className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/festivals/${f.slug}`}
                    className="text-peacock font-semibold underline"
                  >
                    {f.name}
                  </Link>
                  <span>{f.when}</span>
                  {!f.checked && (
                    <Badge tone="marigold">Date not yet checked</Badge>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {digest.days.length ? (
          digest.days.map((day) => (
            <section key={day.heading} className="flex flex-col gap-2">
              <h3 className="text-xl font-bold">{day.heading}</h3>
              <ul className="flex flex-col gap-1">
                {day.events.map((e) => (
                  <li key={e.id}>
                    <span className="text-marigold-ink font-semibold">
                      {eventTime(e)}
                    </span>{" "}
                    {e.title},{" "}
                    <Link
                      href={`/mandirs/${e.mandir.slug}`}
                      className="text-peacock underline"
                    >
                      {e.mandir.name}
                    </Link>{" "}
                    <span className="text-muted">({e.mandir.town})</span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="text-muted">No events listed this week yet.</p>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Plain text</h2>
        <pre className="bg-sunk rounded-xl p-4 font-sans text-base whitespace-pre-wrap">
          {text}
        </pre>
        <CopyText text={text} />
      </Card>
    </>
  );
}
