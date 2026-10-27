import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, Card, Notice } from "@/components/ui";
import { pageTitle } from "@/lib/site";
import { isCode } from "@/lib/weekly-email";
import { leaveWeekly } from "../actions";

// "Stop these emails", from any weekly email. Always there, even if the
// weekly email is switched off again, so anyone who got one can leave.

export const metadata: Metadata = {
  title: pageTitle("Stop the weekly email"),
  robots: { index: false },
};

export default function LeavePage(props: PageProps<"/weekly/leave">) {
  return (
    <>
      <PageHeading title="Stop the weekly email" />
      <Suspense>
        <Leave {...props} />
      </Suspense>
    </>
  );
}

async function Leave({ searchParams }: PageProps<"/weekly/leave">) {
  const query = await searchParams;
  if (query.done === "1") {
    return (
      <Notice tone="success">
        Done. Your address is deleted and no more emails will come.
      </Notice>
    );
  }
  if (!isCode(query.code)) {
    return (
      <Notice tone="error">
        This link isn&apos;t complete. Use the link at the bottom of the email.
      </Notice>
    );
  }
  return (
    <Card>
      <p>Press the button and your email address is deleted straight away.</p>
      <form action={leaveWeekly}>
        <input type="hidden" name="code" value={query.code} />
        <button type="submit" className={buttonClass}>
          Stop the weekly email
        </button>
      </form>
    </Card>
  );
}
