import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, Card, inputClass, Notice } from "@/components/ui";
import { REGIONS } from "@/lib/mandir-form";
import { pageMetadata } from "@/lib/site";
import { weeklyEmailOn } from "@/lib/weekly-email";
import { signUpWeekly } from "./actions";

// Sign up for the weekly "What's on" email. Not there at all until the
// weekly email is switched on (lib/weekly-email.ts, decision 0006).

export const metadata: Metadata = pageMetadata(
  "What's on, every week",
  "One email a week: what's on at mandirs near you, and festivals coming up.",
  "/weekly",
);

const ERRORS: Record<string, string> = {
  email: "Please check your email address.",
  region: "Please choose an area from the list.",
  slow: "Please wait a few minutes before trying again.",
  busy: "Lots of people are signing up just now. Please try again in an hour.",
  failed: "Something went wrong. Please try again.",
};

export default function WeeklyPage(props: PageProps<"/weekly">) {
  if (!weeklyEmailOn()) notFound();
  return (
    <>
      <PageHeading
        title="What's on, every week"
        intro="One email on Thursday morning: what's on at mandirs in the coming week, and festivals coming up. Stop it any time, in one tap."
      />
      <Suspense>
        <SignUp {...props} />
      </Suspense>
    </>
  );
}

async function SignUp({ searchParams }: PageProps<"/weekly">) {
  const query = await searchParams;
  if (query.sent === "1") {
    return (
      <Notice tone="success">
        Nearly done: we&apos;ve sent you an email. Press the link in it to start
        getting the weekly email. If it hasn&apos;t come, check your spam
        folder.
      </Notice>
    );
  }
  const error = ERRORS[String(query.error ?? "")];
  return (
    <Card>
      {error && <Notice tone="error">{error}</Notice>}
      <form action={signUpWeekly} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Your email address</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Which area?</span>
          <select name="region" defaultValue="" className={inputClass}>
            <option value="">All of the UK</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {/* Only automated spam fills this in. */}
        <input
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <button type="submit" className={buttonClass}>
          Send me the weekly email
        </button>
      </form>
      <p className="text-muted text-base">
        We keep only your email address and the area you chose, nothing else,
        and use them only for this email. Every email has a link to stop it,
        which deletes your address at once. See our{" "}
        <a href="/privacy" className="underline">
          privacy notice
        </a>
        .
      </p>
    </Card>
  );
}
