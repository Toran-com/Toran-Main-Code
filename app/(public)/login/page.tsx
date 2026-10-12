import type { Metadata } from "next";
import { Suspense } from "react";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
  PageShell,
} from "@/components/ui";
import { readSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/redirect";
import { pageTitle } from "@/lib/site";
import { requestLoginLink } from "./actions";

export const metadata: Metadata = { title: pageTitle("Log in") };

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
    <PageShell title="Log in">
      <Suspense fallback={<Loading />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function LoginForm({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const next = safeNextPath(one(params.next));
  const error = one(params.error);

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
      <Card>
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
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-muted">
        For mandir committees. Enter your email and we&apos;ll send you a link
        to log in. No password needed.
      </p>
      {error && errors[error] && <Notice tone="error">{errors[error]}</Notice>}
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
        <button type="submit" className={buttonClass}>
          Email me a login link
        </button>
      </form>
    </Card>
  );
}
