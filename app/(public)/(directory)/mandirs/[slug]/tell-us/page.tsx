import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadProblem } from "@/components/public-shell";
import { ReportMessage } from "@/components/report-message";
import { buttonClass, Card, inputClass } from "@/components/ui";
import { getMandir, listMandirs } from "@/lib/directory";
import { pageMetadata } from "@/lib/site";
import { reportEvent } from "./actions";

export const metadata: Metadata = {
  ...pageMetadata("Tell us about an event"),
  robots: { index: false },
};

// Static like the mandir page, so an unknown mandir is a proper 404. The
// thanks or problem after sending is shown by ReportMessage.
export const ensureStatic = "navigation";

const NO_MANDIRS = "no-mandirs-yet";

export async function generateStaticParams() {
  const result = await listMandirs();
  const slugs = result.state === "ok" ? result.data.map((m) => m.slug) : [];
  return (slugs.length ? slugs : [NO_MANDIRS]).map((slug) => ({ slug }));
}

export default async function TellUsPage({
  params,
}: PageProps<"/mandirs/[slug]/tell-us">) {
  const { slug } = await params;
  const result = await getMandir(slug);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what="mandir's page" />;
  }
  if (!result.data) notFound();
  const mandir = result.data;
  const here = `/mandirs/${mandir.slug}/tell-us`;
  return (
    <>
      <Link
        href={`/mandirs/${mandir.slug}`}
        className="text-peacock self-start font-semibold"
      >
        ← {mandir.name}
      </Link>
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Tell us about an event
        </h1>
        <p className="text-muted text-lg">
          At {mandir.name}, {mandir.town}. Seen a poster or a WhatsApp message
          about something coming up? Tell us, and we&apos;ll check it with the
          mandir before it goes on the page.
        </p>
      </div>

      <Suspense>
        <ReportMessage again={here} />
      </Suspense>

      <Card>
        <form action={reportEvent} className="flex flex-col gap-5">
          <input type="hidden" name="slug" value={mandir.slug} />
          <label className="flex flex-col gap-2">
            <span className="font-semibold">What&apos;s happening?</span>
            <input
              name="title"
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Diwali celebrations"
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Date</span>
              <input name="date" type="date" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Starts (optional)</span>
              <input name="time" type="time" className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">
              Anything else people should know? (optional)
            </span>
            <textarea
              name="summary"
              maxLength={280}
              rows={3}
              placeholder="e.g. Garba from 8pm, prasad after aarti."
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">
              Where did you see it? (optional)
            </span>
            <span className="text-muted -mt-1 text-base">
              A link to the poster or post, if there is one.
            </span>
            <input
              name="link"
              type="url"
              inputMode="url"
              maxLength={300}
              placeholder="https://"
              className={inputClass}
            />
          </label>
          {/* Left empty by people; spam-sending programs fill it in. */}
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden"
          >
            <label>
              Leave this empty
              <input
                name="company"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </label>
          </div>
          <p className="text-muted text-base">
            We don&apos;t ask who you are, and we don&apos;t keep anything about
            you. Please don&apos;t include anyone&apos;s phone number or other
            personal details.
          </p>
          <button type="submit" className={buttonClass}>
            Send
          </button>
        </form>
      </Card>
    </>
  );
}
