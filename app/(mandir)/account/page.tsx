import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageShell, quietButtonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";

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

  const supabase = await createSessionClient();
  const [{ data: runs }, { data: claims }] = supabase
    ? await Promise.all([
        supabase
          .from("mandir_admins")
          .select("mandir:mandirs (slug, name, town)")
          .eq("user_id", user.id),
        supabase
          .from("mandir_claims")
          .select("id, mandir:mandirs (name, town)")
          .eq("user_id", user.id)
          .eq("status", "pending"),
      ])
    : [{ data: null }, { data: null }];
  const mandirs = (runs ?? []).flatMap((r) => (r.mandir ? [r.mandir] : []));

  return (
    <Card>
      <dl className="flex flex-col gap-1">
        <dt className="text-muted text-base">Logged in as</dt>
        <dd className="text-xl font-semibold break-all">{user.email}</dd>
      </dl>
      {mandirs.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">Your mandirs</h2>
          <ul className="flex flex-col gap-1">
            {mandirs.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/manage/${m.slug}`}
                  className="text-peacock font-semibold underline"
                >
                  {m.name}, {m.town}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {claims?.map((c) => (
        <p key={c.id} className="text-muted">
          We&apos;re checking your request to look after {c.mandir?.name}
          {c.mandir ? `, ${c.mandir.town}` : ""}.
        </p>
      ))}
      {mandirs.length === 0 && !claims?.length && (
        <p className="text-muted">
          On a mandir&apos;s committee? Find it on the{" "}
          <Link href="/mandirs" className="text-peacock underline">
            mandir list
          </Link>{" "}
          and choose &ldquo;Look after this page&rdquo;.
        </p>
      )}
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
