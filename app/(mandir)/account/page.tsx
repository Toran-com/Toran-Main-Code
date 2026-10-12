import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageShell, quietButtonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = { title: pageTitle("Your account") };

export default function AccountPage() {
  return (
    <PageShell title="Your account">
      <Suspense fallback={<Loading />}>
        <Account />
      </Suspense>
    </PageShell>
  );
}

async function Account() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Faccount");

  return (
    <Card>
      <dl className="flex flex-col gap-1">
        <dt className="text-muted text-base">Logged in as</dt>
        <dd className="text-xl font-semibold break-all">{user.email}</dd>
      </dl>
      <p className="text-muted">
        Soon you&apos;ll manage your mandir&apos;s events and seva rota from
        here.
      </p>
      {user.isToranAdmin && (
        <Link href="/ops" className="text-peacock font-semibold underline">
          Toran admin
        </Link>
      )}
      <form action="/auth/signout" method="post">
        <button type="submit" className={quietButtonClass}>
          Log out
        </button>
      </form>
    </Card>
  );
}
