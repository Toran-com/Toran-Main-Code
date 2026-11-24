import type { Metadata } from "next";
import { Suspense } from "react";
import { CopyText } from "@/components/copy-text";
import { OpsPage } from "@/components/ops-page";
import {
  Card,
  inputClass,
  Loading,
  Notice,
  quietButtonClass,
} from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { committeeEmailOn } from "@/lib/committee-monthly-send";
import { londonDate } from "@/lib/london";
import { mailerReady } from "@/lib/mailer";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { sendPreviewToMe } from "./actions";
import { previewEmail } from "./monthly";

// The monthly email to each mandir's committee: how its page did, who
// follows it, what's coming up and anything to do. The weekly job sends it
// once a month when COMMITTEE_EMAIL is "on" (lib/committee-monthly-send.ts).
// Here a Toran admin sees what it says for any mandir, sends it to
// themselves, and sees which committees have had this month's.

export const metadata: Metadata = {
  title: pageTitle("Committee email · Admin"),
  robots: { index: false },
};

export default function CommitteeEmailPage(
  props: PageProps<"/ops/committee-email">,
) {
  return (
    <OpsPage
      title="Monthly committee email"
      intro="The monthly email to each mandir's committee."
    >
      <Suspense fallback={<Loading />}>
        <Preview {...props} />
      </Suspense>
    </OpsPage>
  );
}

async function Preview({ searchParams }: PageProps<"/ops/committee-email">) {
  await requireToranAdmin("/ops/committee-email");
  const supabase = await createSessionClient();
  if (!supabase) {
    return <Notice tone="error">Couldn&apos;t load the mandirs.</Notice>;
  }
  const query = await searchParams;
  // Only mandirs with a committee on Toran get it.
  const { data: mandirs } = await supabase
    .from("mandirs")
    .select("id, slug, name, town, calendar, postcode, website, phone")
    .eq("status", "claimed")
    .order("name");
  const chosen = (mandirs ?? []).find((m) => m.slug === query.mandir);

  const preview = chosen ? await previewEmail(supabase, chosen) : null;
  const email = preview?.email ?? null;
  const problem = preview?.problem ?? false;
  const month = londonDate().slice(0, 7);
  const { data: sentRows } = await supabase
    .from("committee_emails_sent")
    .select("mandir_id, recipients")
    .eq("month", month);
  const sentTo = new Map(
    (sentRows ?? []).map((r) => [r.mandir_id, r.recipients]),
  );
  const on = committeeEmailOn() && mailerReady();

  return (
    <>
      {on ? (
        <Notice tone="success">
          <strong>On.</strong> Every Thursday, committees that haven&apos;t had
          this month&apos;s email get it: so on the first Thursday of the month,
          and any left over the week after. Committees that joined in the last
          two weeks wait for next month. Each member can stop it from the email.
        </Notice>
      ) : (
        <Notice>
          <strong>Not sending yet.</strong> To start, set COMMITTEE_EMAIL to
          &ldquo;on&rdquo; in Vercel
          {mailerReady()
            ? ""
            : ", with the email sender (RESEND_API_KEY and DIGEST_FROM)"}
          . Check the wording here first, and send one to yourself.
        </Notice>
      )}
      {query.sent === "1" && (
        <Notice tone="success">Sent to your email address.</Notice>
      )}
      {query.sent === "0" && (
        <Notice tone="error">
          It couldn&apos;t be sent: check the email sender is set up in Vercel.
        </Notice>
      )}

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-[1_1_18rem] flex-col gap-2">
            <span className="font-semibold">Mandir with a committee</span>
            <select
              name="mandir"
              defaultValue={chosen?.slug ?? ""}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Choose a mandir
              </option>
              {(mandirs ?? []).map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}, {m.town}
                  {sentTo.has(m.id)
                    ? ` · sent this month to ${sentTo.get(m.id)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={quietButtonClass}>
            Show
          </button>
        </form>
        {(mandirs ?? []).length === 0 && (
          <p className="text-muted">No mandir has a committee on Toran yet.</p>
        )}
      </Card>

      {email && (
        <section
          aria-labelledby="preview"
          className="flex max-w-3xl flex-col gap-3"
        >
          <h2 id="preview" className="text-2xl font-bold">
            {email.subject}
          </h2>
          {problem && (
            <Notice tone="error">
              The page numbers couldn&apos;t be loaded, so they show as 0.
            </Notice>
          )}
          <pre className="border-line bg-surface rounded-2xl border p-5 font-sans text-lg whitespace-pre-wrap">
            {email.text}
          </pre>
          <div className="flex flex-wrap items-center gap-3">
            <form action={sendPreviewToMe}>
              <input type="hidden" name="mandir" value={chosen!.slug} />
              <button type="submit" className={quietButtonClass}>
                Send this to me
              </button>
            </form>
            <CopyText text={email.text} label="Copy the text" />
          </div>
        </section>
      )}
    </>
  );
}
