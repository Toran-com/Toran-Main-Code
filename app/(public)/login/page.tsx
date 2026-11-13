import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  buttonClass,
  inputClass,
  Loading,
  Notice,
  quietButtonClass,
} from "@/components/ui";
import { PageShell } from "@/components/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { readSupabaseEnv } from "@/lib/env";
import { FAMILY_ACCOUNTS } from "@/lib/family-accounts";
import { safeNextPath } from "@/lib/redirect";
import { pageTitle } from "@/lib/site";
import { requestLoginLink } from "./actions";

// The way in, from "Log in" in every page's header: two doors, side by
// side on a laptop and one above the other on a phone. Families: their
// mandirs and plan, kept on this phone, or on their account once family
// accounts are switched on (decision 0020). Mandir committees: create the
// mandir's free account (/join), or log in. Everyone logs in with an
// emailed link (decision 0010); the same link creates the account.

export const metadata: Metadata = {
  title: pageTitle("Log in"),
  description:
    "Log in to Toran, or create a free account: families keep their mandirs and plan, and mandir committees put their events on Toran.",
};

const errors: Record<string, string> = {
  email:
    "That doesn't look like an email address. Please check it and try again.",
  send: "We couldn't send the email just now. Please try again in a minute.",
  "slow-down":
    "Too many login emails were requested. Please wait a few minutes.",
  link: "That login link has expired or was already used. Ask for a new one below.",
  unavailable: "Logging in isn't switched on yet.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <PageShell title="Log in" wide>
      <Suspense fallback={<Loading />}>
        <LoginDoors searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

const doorClass =
  "border-line bg-surface shadow-card flex flex-col gap-5 rounded-3xl border p-6 sm:p-8";
const tick = (
  <span
    aria-hidden="true"
    className="bg-peacock/10 text-peacock mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-base font-bold"
  >
    ✓
  </span>
);

async function LoginDoors({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const next = safeNextPath(one(params.next));
  const error = one(params.error);
  const closed = one(params.closed);

  let configured = true;
  try {
    configured = readSupabaseEnv() !== null;
  } catch {
    configured = false;
  }
  if (!configured) {
    return (
      <Notice>
        Logging in isn&apos;t switched on yet. Mandir committees will be able to
        log in here soon.
      </Notice>
    );
  }

  if (one(params.sent)) {
    return (
      <div className={doorClass}>
        <Notice tone="success">Check your email for a login link.</Notice>
        <p className="text-muted">
          It can take a minute to arrive; check your spam folder too. The link
          works once and expires after an hour.
        </p>
        <a
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-peacock font-semibold underline"
        >
          Use a different email
        </a>
      </div>
    );
  }

  const user = await getCurrentUser();

  return (
    <>
      <p className="text-muted text-xl leading-relaxed">
        Choose the one that&apos;s you. There&apos;s no password: we email you a
        link, and the same link creates your account the first time.
      </p>
      {closed && (
        <Notice tone="success">
          Your account is closed and what it saved is deleted.
        </Notice>
      )}
      {user && (
        <Notice tone="success">
          You&apos;re logged in as <strong>{user.email}</strong>.{" "}
          <Link href="/account" className="font-semibold underline">
            Go to your account
          </Link>
        </Notice>
      )}
      {error && errors[error] && <Notice tone="error">{errors[error]}</Notice>}

      <div className="grid items-start gap-6 md:grid-cols-2">
        {/* Families */}
        {/* While family accounts are off there's nothing for families to
            log in to, so the mandir door, the account to create, comes
            first. */}
        <section
          aria-labelledby="door-family"
          className={`${doorClass} ${FAMILY_ACCOUNTS ? "" : "order-2"}`}
        >
          <div className="flex flex-col gap-2">
            <p className="text-peacock text-base font-bold tracking-[0.08em] uppercase">
              For families
            </p>
            <h2
              id="door-family"
              className="font-display text-3xl leading-tight sm:text-4xl"
            >
              Your mandirs and your plan
            </h2>
          </div>
          {FAMILY_ACCOUNTS ? (
            <>
              <p className="text-muted">
                Log in to keep the mandirs you follow and the events you plan on
                your phone, tablet and laptop. Free.
              </p>
              <form action={requestLoginLink} className="flex flex-col gap-4">
                <input type="hidden" name="next" value="/my" />
                <label className="flex flex-col gap-2 font-semibold">
                  Your email
                  <input
                    className={inputClass}
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <button type="submit" className={buttonClass}>
                  Email me a link
                </button>
              </form>
              <p className="text-muted text-base">
                Toran keeps only your email and, if you agree, the mandirs and
                events you save. You can delete them, or your account, at any
                time.
              </p>
            </>
          ) : (
            <>
              <p className="text-muted">
                You don&apos;t need an account. Follow mandirs and plan your
                visits, and Toran keeps them on this phone, in My Toran.
              </p>
              <ul className="flex flex-col gap-3">
                <li className="flex gap-3">
                  {tick}
                  Follow your mandirs and see their events first
                </li>
                <li className="flex gap-3">
                  {tick}
                  Plan a day out and send it to the family
                </li>
                <li className="flex gap-3">
                  {tick}
                  Take a seva slot, no sign-up needed
                </li>
              </ul>
              <Link href="/my" className={`${quietButtonClass} text-center`}>
                Open My Toran
              </Link>
              <p className="text-muted text-base">
                Accounts for families, to keep them on every device, are coming
                soon.
              </p>
            </>
          )}
        </section>

        {/* Mandir committees */}
        <section
          aria-labelledby="door-mandir"
          className={`${doorClass} border-peacock/40 ring-peacock/10 ring-4`}
        >
          <div className="flex flex-col gap-2">
            <p className="text-peacock text-base font-bold tracking-[0.08em] uppercase">
              For mandir committees
            </p>
            <h2
              id="door-mandir"
              className="font-display text-3xl leading-tight sm:text-4xl"
            >
              Put your mandir&apos;s events on Toran
            </h2>
          </div>
          <ul className="flex flex-col gap-3">
            <li className="flex gap-3">
              {tick}
              Add events in a minute: type them, tick festivals or send a photo
              of your poster
            </li>
            <li className="flex gap-3">
              {tick}
              Organise your seva rota
            </li>
            <li className="flex gap-3">
              {tick}
              See how many families find you
            </li>
          </ul>
          <Link href="/join" className={`${buttonClass} text-center`}>
            Create your mandir&apos;s account, free
          </Link>
          <div className="border-line flex flex-col gap-4 border-t pt-5">
            <h3 className="text-xl font-bold">Already have an account?</h3>
            <form action={requestLoginLink} className="flex flex-col gap-4">
              <input type="hidden" name="next" value={next} />
              <label className="flex flex-col gap-2 font-semibold">
                Email address
                <input
                  className={inputClass}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </label>
              <button type="submit" className={quietButtonClass}>
                Email me a login link
              </button>
            </form>
          </div>
        </section>
      </div>

      <p className="text-muted text-base">
        By logging in you agree to our{" "}
        <Link href="/terms" className="text-peacock underline">
          terms
        </Link>
        . Our{" "}
        <Link href="/privacy" className="text-peacock underline">
          privacy notice
        </Link>{" "}
        says what we keep and why.
      </p>
    </>
  );
}
