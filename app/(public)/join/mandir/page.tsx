import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  Card,
  inputClass,
  Loading,
  Notice,
  PageShell,
  pillPrimaryClass,
  quietButtonClass,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { listMandirs } from "@/lib/directory";
import { findMandirs } from "@/lib/join";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";

// Creating a committee account, step 2: find your mandir, then ask to look
// after its page (/mandirs/<slug>/claim), which Toran checks.

export const metadata: Metadata = {
  title: pageTitle("Choose your mandir"),
  robots: { index: false },
};

export default function ChooseMandirPage(props: PageProps<"/join/mandir">) {
  return (
    <PageShell title="Choose your mandir">
      <Suspense fallback={<Loading />}>
        <Choose {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Choose({ searchParams }: PageProps<"/join/mandir">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fjoin%2Fmandir");

  const query = await searchParams;
  const typed = String(query.q ?? "").slice(0, 100);

  const supabase = await createSessionClient();
  const [{ data: runs }, { data: claims }, mandirs] = await Promise.all([
    supabase
      ? supabase
          .from("mandir_admins")
          .select("mandir:mandirs (slug, name, town)")
          .eq("user_id", user.id)
      : { data: null },
    supabase
      ? supabase
          .from("mandir_claims")
          .select("id, mandir:mandirs (slug, name, town)")
          .eq("user_id", user.id)
          .eq("status", "pending")
      : { data: null },
    listMandirs(),
  ]);
  const mine = (runs ?? []).flatMap((r) => (r.mandir ? [r.mandir] : []));
  const asked = (claims ?? []).flatMap((c) => (c.mandir ? [c.mandir] : []));
  const taken = new Set([...mine, ...asked].map((m) => m.slug));
  const all = mandirs.state === "ok" ? mandirs.data : [];
  const { found, more } = findMandirs(all, typed);

  return (
    <>
      {mine.length > 0 && (
        <Notice tone="success">
          You already help run{" "}
          {mine.map((m, i) => (
            <span key={m.slug}>
              {i > 0 && ", "}
              <Link href={`/manage/${m.slug}`} className="underline">
                {m.name}, {m.town}
              </Link>
            </span>
          ))}
          . Choose another mandir below, or go to{" "}
          <Link href="/account" className="underline">
            your account
          </Link>
          .
        </Notice>
      )}
      {asked.map((m) => (
        <Notice key={m.slug}>
          We&apos;re checking your request for {m.name}, {m.town}. We&apos;ll
          let you know when it&apos;s approved.
        </Notice>
      ))}

      <Card>
        <p className="text-lg">
          Type your mandir&apos;s name or town. Most UK mandirs already have a
          page on Toran.
        </p>
        <form className="flex flex-wrap gap-3" role="search">
          <label className="flex min-w-0 flex-[1_1_16rem] flex-col gap-2">
            <span className="font-semibold">Mandir or town</span>
            <input
              name="q"
              type="search"
              defaultValue={typed}
              placeholder="e.g. Leicester, BAPS, Shri Ram Mandir"
              autoComplete="off"
              className={inputClass}
            />
          </label>
          <button type="submit" className={`${quietButtonClass} self-end`}>
            Find
          </button>
        </form>
        {mandirs.state !== "ok" && (
          <Notice tone="error">
            The mandir list couldn&apos;t be loaded just now. Please try again
            in a minute.
          </Notice>
        )}
      </Card>

      {typed && (
        <section aria-labelledby="found" className="flex flex-col gap-3">
          <h2 id="found" className="text-xl font-bold">
            {found.length
              ? `Mandirs matching “${typed}”`
              : `No mandir matches “${typed}”`}
          </h2>
          {found.length > 0 && (
            <ul className="flex flex-col gap-3">
              {found.map((m) => (
                <li
                  key={m.slug}
                  className="border-line bg-surface shadow-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
                >
                  <span>
                    <span className="block text-lg font-semibold">
                      {m.name}
                    </span>
                    <span className="text-muted">
                      {m.town}, {m.region}
                    </span>
                  </span>
                  {taken.has(m.slug) ? (
                    <span className="text-muted">Already yours</span>
                  ) : (
                    <Link
                      href={`/mandirs/${m.slug}/claim`}
                      className={pillPrimaryClass}
                      aria-label={`This is my mandir: ${m.name}, ${m.town}`}
                    >
                      This is my mandir
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {more && (
            <p className="text-muted">
              More mandirs match. Add the town to narrow it down.
            </p>
          )}
          <p className="text-muted">
            Can&apos;t find your mandir?{" "}
            <Link href="/contact" className="text-peacock underline">
              Tell us its name and town
            </Link>{" "}
            and we&apos;ll add it.
          </p>
        </section>
      )}
    </>
  );
}
