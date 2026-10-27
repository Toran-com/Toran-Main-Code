import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, Card, Notice } from "@/components/ui";
import { pageTitle } from "@/lib/site";
import { isCode, weeklyEmailOn } from "@/lib/weekly-email";
import { confirmWeekly } from "../actions";

// The link in the "Please confirm" email. A button, not the link itself,
// confirms: email programs open links to check them, and that mustn't
// sign anyone up.

export const metadata: Metadata = {
  title: pageTitle("Confirm the weekly email"),
  robots: { index: false },
};

export default function ConfirmPage(props: PageProps<"/weekly/confirm">) {
  if (!weeklyEmailOn()) notFound();
  return (
    <>
      <PageHeading title="Confirm the weekly email" />
      <Suspense>
        <Confirm {...props} />
      </Suspense>
    </>
  );
}

async function Confirm({ searchParams }: PageProps<"/weekly/confirm">) {
  const query = await searchParams;
  if (query.done === "1") {
    return (
      <Notice tone="success">
        Done. The first email comes on Thursday morning. To stop it, use the
        link at the bottom of any of them.
      </Notice>
    );
  }
  if (query.error || !isCode(query.code)) {
    return (
      <Notice tone="error">
        This link doesn&apos;t work any more. Links work for a week.{" "}
        <Link href="/weekly" className="underline">
          Sign up again
        </Link>
        .
      </Notice>
    );
  }
  return (
    <Card>
      <form action={confirmWeekly}>
        <input type="hidden" name="code" value={query.code} />
        <button type="submit" className={buttonClass}>
          Yes, send me the weekly email
        </button>
      </form>
    </Card>
  );
}
