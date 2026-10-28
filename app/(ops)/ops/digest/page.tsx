import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CopyEmail } from "@/components/copy-email";
import { CopyText } from "@/components/copy-text";
import { OpsNav } from "@/components/ops-nav";
import { Badge, LoadProblem } from "@/components/public-shell";
import {
  Card,
  inputClass,
  Loading,
  Notice,
  quietButtonClass,
} from "@/components/ui";
import { PageShell } from "@/components/page-shell";
import { requireToranAdmin } from "@/lib/auth";
import {
  buildDigest,
  digestHtml,
  digestText,
  digestWhatsApp,
  eventTime,
} from "@/lib/digest";
import { listFestivalDates } from "@/lib/directory";
import { formatDateRange } from "@/lib/format";
import { REGIONS } from "@/lib/mandir-form";
import { pageTitle, siteUrl } from "@/lib/site";
import { listUpcomingEvents, positionForSearch } from "@/lib/whats-on";
import { nearTo, RADII, radiusFrom } from "@/lib/whats-on-view";

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
  const near = String(query.near ?? "")
    .trim()
    .slice(0, 10);
  const within = radiusFrom(query.within);
  // "This week" depends on today, so work it out per visit.
  await connection();
  const [events, dates, origin] = await Promise.all([
    listUpcomingEvents(),
    listFestivalDates(),
    near ? positionForSearch(near) : Promise.resolve(null),
  ]);
  if (events.state !== "ok") {
    return <LoadProblem state={events.state} what="event list" />;
  }
  // Narrowed to a postcode's area, for a pilot-area email.
  const position = origin && origin !== "unavailable" ? origin : null;
  const nearProblem = near && !position;
  const digest = buildDigest(
    position ? nearTo(events.data, position, within) : events.data,
    dates.state === "ok" ? dates.data : [],
    new Date(),
    region,
    position ? `within ${within} miles of ${near.toUpperCase()}` : null,
  );
  const text = digestText(digest, siteUrl());
  const html = digestHtml(digest, siteUrl());
  const whatsApp = digestWhatsApp(digest, siteUrl());

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
        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold">Near a postcode</span>
          <input
            name="near"
            defaultValue={near}
            placeholder="e.g. HA9"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold">Within</span>
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
        <button
          type="submit"
          className={`${quietButtonClass} px-4 py-2 text-base`}
        >
          Show
        </button>
      </form>
      {nearProblem && (
        <Notice tone="error">
          We couldn&apos;t find &ldquo;{near}&rdquo;, so this isn&apos;t
          narrowed to a postcode.
        </Notice>
      )}

      <Card>
        <p className="text-muted text-base">Email preview</p>
        <h2 className="font-display text-4xl leading-tight">
          What&apos;s on at mandirs
        </h2>
        <p className="text-marigold-ink font-semibold">
          {formatDateRange(digest.start, digest.end)}
          {region && ` · ${region}`}
          {digest.area && ` · ${digest.area}`} · {digest.count}{" "}
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
        <h2 className="text-xl font-bold">Send it by hand</h2>
        <p className="text-muted">
          &ldquo;Copy the email&rdquo; keeps the headings and a link to every
          event when pasted into Gmail, Buttondown or Mailchimp. Email tools
          that want HTML can use the HTML instead.
        </p>
        <CopyEmail html={html} text={text} />
        <CopyText text={html} label="Copy the HTML" />
      </Card>

      <Card>
        <h2 className="text-xl font-bold">For WhatsApp</h2>
        <pre className="bg-sunk rounded-xl p-4 font-sans text-base whitespace-pre-wrap">
          {whatsApp}
        </pre>
        <CopyText text={whatsApp} label="Copy for WhatsApp" />
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
