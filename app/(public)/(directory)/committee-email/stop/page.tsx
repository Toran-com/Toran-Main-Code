import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, Card, Notice, quietButtonClass } from "@/components/ui";
import {
  checkStopCode,
  type EmailKind,
  emailKind,
} from "@/lib/committee-email";
import { pageTitle } from "@/lib/site";
import { createRobotClient } from "@/lib/supabase/robot";
import { setCommitteeEmail } from "../actions";

// "To stop it", from an email to a committee member: the monthly one, or
// the seva emails (?k=seva). A button, not the link itself, stops it, so a
// mail scanner opening the link doesn't. They can start it again here too.

export const metadata: Metadata = {
  title: pageTitle("Stop an email from Toran"),
  robots: { index: false },
};

const WORDS: Record<
  EmailKind,
  {
    heading: string;
    which: string;
    about: (name: string) => string;
    stop: string;
    again: string;
    after: string;
  }
> = {
  // The weekly email (decision 0030): "monthly" in links from before it.
  monthly: {
    heading: "The weekly email about your mandir",
    which: "the weekly email",
    about: (name) =>
      `Every Monday Toran emails you how ${name}'s page did last week, who follows it and anything worth doing.`,
    stop: "Stop the weekly email",
    again: "Start the weekly email again",
    after:
      "Your mandir's numbers are always on its Numbers page when you log in.",
  },
  seva: {
    heading: "Seva emails about your mandir",
    which: "the seva emails",
    about: (name) =>
      `Toran emails you each evening when people have taken seva places at ${name}, and straight away when a seva is full.`,
    stop: "Stop the seva emails",
    again: "Start the seva emails again",
    after:
      "How many places are taken is always on your seva page when you log in.",
  },
};

export default function StopPage(props: PageProps<"/committee-email/stop">) {
  return (
    <Suspense fallback={<PageHeading title={WORDS.monthly.heading} />}>
      <Stop {...props} />
    </Suspense>
  );
}

async function Stop({ searchParams }: PageProps<"/committee-email/stop">) {
  const { u, m, c, k, done } = await searchParams;
  const kind = emailKind(k);
  const words = WORDS[kind];
  return (
    <>
      <PageHeading title={words.heading} />
      <StopCard u={u} m={m} c={c} kind={kind} done={done} />
    </>
  );
}

async function StopCard({
  u,
  m,
  c,
  kind,
  done,
}: {
  u: unknown;
  m: unknown;
  c: unknown;
  kind: EmailKind;
  done: unknown;
}) {
  const words = WORDS[kind];
  if (!checkStopCode(u, m, c, undefined, kind)) {
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
      {kind !== "monthly" && <input type="hidden" name="k" value={kind} />}
    </>
  );
  if (done === "off") {
    return (
      <Card>
        <Notice tone="success">
          Done. You won&apos;t get {words.which} about {name} again.
        </Notice>
        <p className="text-muted">{words.after} Changed your mind?</p>
        <form action={setCommitteeEmail}>
          {hidden}
          <input type="hidden" name="wanted" value="yes" />
          <button type="submit" className={`${quietButtonClass} self-start`}>
            {words.again}
          </button>
        </form>
      </Card>
    );
  }
  return (
    <Card>
      {done === "on" && (
        <Notice tone="success">
          Done. You&apos;ll get {words.which} about {name} again.
        </Notice>
      )}
      <p>
        {words.about(name)} Press the button and it stops straight away. Other
        committee members still get theirs.
      </p>
      <form action={setCommitteeEmail}>
        {hidden}
        <input type="hidden" name="wanted" value="no" />
        <button type="submit" className={buttonClass}>
          {words.stop}
        </button>
      </form>
    </Card>
  );
}
