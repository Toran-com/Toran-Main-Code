import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { readSupabaseEnv } from "@/lib/env";
import { pageTitle } from "@/lib/site";
import { requestLoginLink } from "../login/actions";

// "Create an account": the way in for mandir committees, from "For
// mandirs". Two choices. Committee members give their email, get a link,
// then choose their mandir (/join/mandir) for Toran to check. Visitors
// don't need an account (decision 0006): what they save stays on their
// phone, in My Toran.

export const metadata: Metadata = {
  title: pageTitle("Create an account"),
  description:
    "Create a Toran account to look after your mandir's page: add events, keep its details right and organise seva. Free for mandirs.",
};

const ERRORS: Record<string, string> = {
  email:
    "That doesn't look like an email address. Please check it and try again.",
  send: "We couldn't send the email just now. Please try again in a minute.",
  "slow-down": "Too many emails were requested. Please wait a few minutes.",
  unavailable: "Creating accounts isn't switched on yet.",
};

const NEXT = "/join/mandir";

export default function JoinPage(props: PageProps<"/join">) {
  return (
    <PageShell title="Create an account">
      <Suspense fallback={<Loading />}>
        <Join {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Join({ searchParams }: PageProps<"/join">) {
  const query = await searchParams;
  const error = ERRORS[String(query.error ?? "")];

  let configured = true;
  try {
    configured = readSupabaseEnv() !== null;
  } catch {
    configured = false;
  }
  const user = configured ? await getCurrentUser() : null;

  if (query.sent) {
    return (
      <Card>
        <Notice tone="success">
          Check your email. Press the link in it to carry on.
        </Notice>
        <p className="text-muted">
          It can take a minute to arrive; check your spam folder too. The link
          works once and expires after an hour. Then you&apos;ll choose your
          mandir.
        </p>
        <Link href="/join" className="text-peacock font-semibold underline">
          Use a different email
        </Link>
      </Card>
    );
  }

  return (
    <>
      <p className="text-muted text-lg">Which describes you?</p>
      {error && <Notice tone="error">{error}</Notice>}

      <Card>
        <h2 className="text-2xl font-bold">I help run a mandir</h2>
        <p>
          Add your mandir&apos;s events, keep its details right and organise
          seva. Free for mandirs.
        </p>
        <ol className="text-muted flex list-decimal flex-col gap-1 pl-6">
          <li>Enter your email. We send you a link: no password needed.</li>
          <li>Choose your mandir and say what you do there.</li>
          <li>
            We check you&apos;re on the committee, usually with a quick phone
            call, then your mandir&apos;s page is yours to update.
          </li>
        </ol>
        {!configured ? (
          <Notice>
            Creating accounts isn&apos;t switched on yet. Mandir committees will
            be able to join here soon.
          </Notice>
        ) : user ? (
          <div className="flex flex-col gap-3">
            <p>
              You&apos;re logged in as{" "}
              <strong className="break-all">{user.email}</strong>.
            </p>
            <Link href={NEXT} className={`${buttonClass} self-start`}>
              Choose your mandir
            </Link>
          </div>
        ) : (
          <form action={requestLoginLink} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={NEXT} />
            <input type="hidden" name="from" value="join" />
            <label className="flex flex-col gap-2 font-semibold">
              Your email address
              <input
                className={inputClass}
                type="email"
                name="email"
                autoComplete="email"
                required
              />
            </label>
            <button type="submit" className={buttonClass}>
              Email me a link to carry on
            </button>
            <p className="text-muted text-base">
              We keep your email address and which mandir you help run, nothing
              else. See our{" "}
              <Link href="/privacy" className="text-peacock underline">
                privacy notice
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-peacock underline">
                terms
              </Link>
              .
            </p>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="text-2xl font-bold">I&apos;m visiting mandirs</h2>
        <p>
          You don&apos;t need an account. The mandirs you follow, your
          family&apos;s plan and the seva you&apos;ve taken are saved on this
          phone, in My Toran.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/my" className={quietButtonClass}>
            Open My Toran
          </Link>
          <Link href="/whats-on" className={quietButtonClass}>
            See what&apos;s on
          </Link>
        </div>
      </Card>

      {!user && (
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-peacock font-semibold underline">
            Log in
          </Link>
        </p>
      )}
    </>
  );
}
