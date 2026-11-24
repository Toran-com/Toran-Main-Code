import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, Card, Notice, quietButtonClass } from "@/components/ui";
import { checkStopCode } from "@/lib/committee-monthly-send";
import { pageTitle } from "@/lib/site";
import { createRobotClient } from "@/lib/supabase/robot";
import { setCommitteeEmail } from "../actions";

// "To stop it", from the monthly email to a committee member. A button,
// not the link itself, stops it, so a mail scanner opening the link
// doesn't. They can start it again here too.

export const metadata: Metadata = {
  title: pageTitle("Stop the monthly email"),
  robots: { index: false },
};

export default function StopPage(props: PageProps<"/committee-email/stop">) {
  return (
    <>
      <PageHeading title="The monthly email about your mandir" />
      <Suspense>
        <Stop {...props} />
      </Suspense>
    </>
  );
}

async function Stop({ searchParams }: PageProps<"/committee-email/stop">) {
  const { u, m, c, done } = await searchParams;
  if (!checkStopCode(u, m, c)) {
    return (
      <Notice tone="error">
        This link isn&apos;t complete. Use the link at the bottom of the email.
      </Notice>
    );
  }
  const db = createRobotClient();
  const { data: mandir } = db
    ? await db
        .from("mandirs")
        .select("name")
        .eq("id", m as string)
        .maybeSingle()
    : { data: null };
  const name = mandir?.name ?? "your mandir";
  const hidden = (
    <>
      <input type="hidden" name="u" value={u as string} />
      <input type="hidden" name="m" value={m as string} />
      <input type="hidden" name="c" value={c as string} />
    </>
  );
  if (done === "off") {
    return (
      <Card>
        <Notice tone="success">
          Done. You won&apos;t get the monthly email about {name} again.
        </Notice>
        <p className="text-muted">
          Your mandir&apos;s numbers are always on its Numbers page when you log
          in. Changed your mind?
        </p>
        <form action={setCommitteeEmail}>
          {hidden}
          <input type="hidden" name="wanted" value="yes" />
          <button type="submit" className={`${quietButtonClass} self-start`}>
            Start the monthly email again
          </button>
        </form>
      </Card>
    );
  }
  return (
    <Card>
      {done === "on" && (
        <Notice tone="success">
          Done. The monthly email about {name} will come again.
        </Notice>
      )}
      <p>
        Once a month Toran emails you how {name}&apos;s page did, who follows it
        and anything worth doing. Press the button and it stops straight away.
        Other committee members still get theirs.
      </p>
      <form action={setCommitteeEmail}>
        {hidden}
        <input type="hidden" name="wanted" value="no" />
        <button type="submit" className={buttonClass}>
          Stop the monthly email
        </button>
      </form>
    </Card>
  );
}
