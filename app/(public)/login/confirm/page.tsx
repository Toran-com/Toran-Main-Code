import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClass, Card, Loading } from "@/components/ui";
import { PageShell } from "@/components/page-shell";
import { safeNextPath } from "@/lib/redirect";
import { pageTitle } from "@/lib/site";
import { confirmLogin } from "../actions";

// Where the login email's link leads (by way of /auth/confirm): one button
// to finish logging in. The link alone logs nobody in, because email
// programs and their virus checkers often open links before the person
// does, which would use it up; they don't press buttons.

export const metadata: Metadata = {
  title: pageTitle("Log in"),
  robots: { index: false },
};

export default function ConfirmLoginPage(props: PageProps<"/login/confirm">) {
  return (
    <PageShell title="Log in">
      <Suspense fallback={<Loading />}>
        <Confirm {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Confirm({ searchParams }: PageProps<"/login/confirm">) {
  const query = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : (v ?? "");
  const tokenHash = one(query.token_hash);
  const type = one(query.type);
  const next = safeNextPath(one(query.next));
  if (!tokenHash || !type) {
    redirect(`/login?error=link&next=${encodeURIComponent(next)}`);
  }
  return (
    <Card>
      <h2 className="text-2xl font-bold">Welcome back to Toran</h2>
      <p>Press the button to finish logging in on this device.</p>
      <form action={confirmLogin} className="flex flex-col gap-4">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className={`${buttonClass} sm:w-auto sm:self-start`}
        >
          Log in
        </button>
      </form>
    </Card>
  );
}
