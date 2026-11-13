import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  buttonClass,
  Card,
  Loading,
  Notice,
  quietButtonClass,
} from "@/components/ui";
import { PageShell } from "@/components/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { loadCommitteeFacts } from "@/lib/committee-facts";
import {
  committeeTasks,
  committeeTodoCount,
  setupSteps,
} from "@/lib/committee-tasks";
import { FAMILY_ACCOUNTS } from "@/lib/family-accounts";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import {
  acceptInvite,
  closeFamilyAccount,
  declineInvite,
  forgetFamilySaved,
} from "./actions";

export const metadata: Metadata = { title: pageTitle("Your account") };

const NOTICES: Record<string, { tone: "error" | "success"; text: string }> = {
  "error=invite": {
    tone: "error",
    text: "That invite has been cancelled or is more than 14 days old. Ask for a new one.",
  },
  "error=consent": {
    tone: "error",
    text: "To accept, please tick the box to agree that Toran can record that you help run this mandir.",
  },
  "error=failed": {
    tone: "error",
    text: "Something went wrong. Please try again.",
  },
  "done=declined": { tone: "success", text: "Thanks. That invite is gone." },
  "error=sure": {
    tone: "error",
    text: "To close your account, tick the box to say you're sure.",
  },
  "error=close": {
    tone: "error",
    text: "This account helps run a mandir, so it can't be closed here. Leave the mandir's committee first, or ask Toran to close it.",
  },
  "done=forgotten": {
    tone: "success",
    text: "Done. Nothing is saved on your account now, and nothing more will be unless you agree again on My Toran. What's on each device stays there.",
  },
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
          .select(
            "mandir:mandirs (id, slug, name, town, calendar, postcode, website, phone)",
          )
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
  // A family account's saved lists (decision 0020), when switched on.
  const { data: saved } =
    FAMILY_ACCOUNTS && supabase
      ? await supabase
          .from("family_saved")
          .select("following, plan, consented_at")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };
  // What each needs doing, so the account page says where to start.
  const todo = await Promise.all(
    mandirs.map(async (m) => {
      const facts = await loadCommitteeFacts(supabase!, m);
      const first =
        setupSteps(facts).find((step) => !step.done) ??
        committeeTasks(facts)[0];
      return { count: committeeTodoCount(facts), first };
    }),
  );

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
          <form className="flex flex-col gap-4">
            <input type="hidden" name="invite" value={invite.id} />
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="consent"
                value="yes"
                required
                className="mt-1.5 size-5 shrink-0"
              />
              <span>
                I agree that Toran can record that I help run this mandir. This
                may show my religion. I can withdraw this at any time by leaving
                the committee on Toran.
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
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
                formNoValidate
                className={quietButtonClass}
              >
                No thanks
              </button>
            </div>
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
            <ul className="flex flex-col gap-3">
              {mandirs.map((m, i) => (
                <li
                  key={m.slug}
                  className="border-line flex flex-col gap-1 rounded-2xl border p-4"
                >
                  <Link
                    href={`/manage/${m.slug}`}
                    className="text-peacock text-lg font-semibold underline"
                  >
                    {m.name}, {m.town}
                  </Link>
                  {todo[i].count === 0 ? (
                    <span className="text-peacock">✓ All up to date</span>
                  ) : (
                    <span>
                      <strong>
                        {todo[i].count === 1
                          ? "1 thing to do"
                          : `${todo[i].count} things to do`}
                      </strong>
                      {todo[i].first && (
                        <>
                          , starting with:{" "}
                          <Link
                            href={
                              todo[i].first.href.startsWith("#")
                                ? `/manage/${m.slug}${todo[i].first.href}`
                                : todo[i].first.href
                            }
                            className="text-peacock underline"
                          >
                            {todo[i].first.title}
                          </Link>
                        </>
                      )}
                    </span>
                  )}
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
        {FAMILY_ACCOUNTS && (
          <div className="border-line flex flex-col gap-3 border-t pt-4">
            <h2 className="text-xl font-bold">Saved for your family</h2>
            <p>
              {saved
                ? `${saved.following.length === 1 ? "1 mandir" : `${saved.following.length} mandirs`} followed and ${Array.isArray(saved.plan) && saved.plan.length === 1 ? "1 event" : `${Array.isArray(saved.plan) ? saved.plan.length : 0} events`} in your plan, on every device you log in on. You agreed to this on ${new Date(saved.consented_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })}.`
                : "Nothing is saved on your account. To keep the mandirs you follow and your plan on every device you log in on, agree to it on My Toran."}
            </p>
            <Link href="/my" className={`${buttonClass} self-start`}>
              Open My Toran
            </Link>
            {saved && (
              <form action={forgetFamilySaved}>
                <button type="submit" className={quietButtonClass}>
                  Delete what&apos;s saved and stop saving
                </button>
              </form>
            )}
          </div>
        )}
        {mandirs.length === 0 && !claims?.length && !invites?.length && (
          <div className="flex flex-col gap-3">
            <p>
              On a mandir&apos;s committee? Choose your mandir, and once
              we&apos;ve checked, you can update its page.
            </p>
            <Link href="/join/mandir" className={`${buttonClass} self-start`}>
              Choose your mandir
            </Link>
          </div>
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
      {FAMILY_ACCOUNTS &&
        mandirs.length === 0 &&
        !claims?.length &&
        !user.isToranAdmin && (
          <Card>
            <h2 className="text-xl font-bold">Close your account</h2>
            <p className="text-muted">
              Deletes your login and everything it saved. What&apos;s on this
              phone stays on this phone.
            </p>
            <form action={closeFamilyAccount} className="flex flex-col gap-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="sure"
                  value="yes"
                  required
                  className="mt-1.5 size-5 shrink-0"
                />
                <span>I&apos;m sure: close my account.</span>
              </label>
              <button
                type="submit"
                className={`${quietButtonClass} self-start`}
              >
                Close my account
              </button>
            </form>
          </Card>
        )}
    </>
  );
}
