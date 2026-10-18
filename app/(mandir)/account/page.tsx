import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  buttonClass,
  Card,
  Loading,
  Notice,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { acceptInvite, declineInvite } from "./actions";

export const metadata: Metadata = { title: pageTitle("Your account") };

const NOTICES: Record<string, { tone: "error" | "success"; text: string }> = {
  "error=invite": {
    tone: "error",
    text: "That invite has been cancelled or is more than 14 days old. Ask for a new one.",
  },
  "error=failed": {
    tone: "error",
    text: "Something went wrong. Please try again.",
  },
  "done=declined": { tone: "success", text: "Thanks. That invite is gone." },
  "done=left": {
    tone: "success",
    text: "Done. You no longer help run that mandir's page.",
  },
};

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <PageShell title="Your account">
      <Suspense fallback={<Loading />}>
        <Account {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Account({ searchParams }: PageProps<"/account">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Faccount");

  const query = await searchParams;
  const notice =
    NOTICES[`error=${String(query.error ?? "")}`] ??
    NOTICES[`done=${String(query.done ?? "")}`];

  const supabase = await createSessionClient();
  const [{ data: runs }, { data: claims }, { data: invites }] = supabase
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
        // Invites to help run a mandir, sent to this login's address.
        supabase
          .from("mandir_invites")
          .select("id, mandir:mandirs (name, town)")
          .eq("email", (user.email ?? "").toLowerCase())
          .gt("expires_at", new Date().toISOString())
          .order("created_at"),
      ])
    : [{ data: null }, { data: null }, { data: null }];
  const mandirs = (runs ?? []).flatMap((r) => (r.mandir ? [r.mandir] : []));

  return (
    <>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {invites?.map((invite) => (
        <Card key={invite.id}>
          <h2 className="text-2xl font-bold">
            Help run {invite.mandir?.name}
            {invite.mandir ? `, ${invite.mandir.town}` : ""}?
          </h2>
          <p>
            Someone on the mandir&apos;s committee has invited you to add and
            change its events on Toran. Accept only if you&apos;re on the
            committee: Toran will then keep that you help run this page, until
            you leave.
          </p>
          <form className="flex flex-wrap gap-2">
            <input type="hidden" name="invite" value={invite.id} />
            <button
              type="submit"
              formAction={acceptInvite}
              className={buttonClass}
            >
              Accept
            </button>
            <button
              type="submit"
              formAction={declineInvite}
              className={quietButtonClass}
            >
              No thanks
            </button>
          </form>
        </Card>
      ))}
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
        {mandirs.length === 0 && !claims?.length && !invites?.length && (
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
    </>
  );
}
