import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, Loading, pillButtonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { MAX_MESSAGE_CHARS } from "@/lib/poster-reader";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";

// Where Android sends a message shared to Toran (app/manifest.ts,
// share_target): long-press a message in WhatsApp, Share, Toran. It goes
// to the committee's "Paste a WhatsApp message" box, filled in, to be
// read and checked there; nothing is read or kept until they press the
// button. iPhones can't share to a web app yet, so they copy and paste.

export const metadata: Metadata = {
  title: pageTitle("Share to Toran"),
  robots: { index: false },
};

export default function SharePage(props: PageProps<"/share">) {
  return (
    <PageShell title="Share to Toran">
      <Suspense fallback={<Loading />}>
        <Share {...props} />
      </Suspense>
    </PageShell>
  );
}

// What was shared, as one message: the text, and a link if there was one
// (some apps send the text as the title).
function sharedText(query: Record<string, string | string[] | undefined>) {
  const part = (key: string) => String(query[key] ?? "").trim();
  return [part("title"), part("text"), part("url")]
    .filter((p, i, all) => p && all.indexOf(p) === i)
    .join("\n")
    .slice(0, MAX_MESSAGE_CHARS);
}

async function Share({ searchParams }: PageProps<"/share">) {
  const query = await searchParams;
  const text = sharedText(query);
  const back = `/share?text=${encodeURIComponent(text)}`;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);

  const supabase = await createSessionClient();
  const { data: runs } = supabase
    ? await supabase
        .from("mandir_admins")
        .select("mandir:mandirs (slug, name, town)")
        .eq("user_id", user.id)
    : { data: [] };
  const mandirs = (runs ?? []).flatMap((r) => (r.mandir ? [r.mandir] : []));
  const to = (slug: string) =>
    `/manage/${slug}?paste=${encodeURIComponent(text)}#read-message`;

  if (!text) {
    return (
      <Card>
        <p>Nothing came through. Copy the message, then paste it in.</p>
        <Link href="/account" className={`${pillButtonClass} self-start`}>
          Your account
        </Link>
      </Card>
    );
  }
  if (mandirs.length === 1) redirect(to(mandirs[0].slug));
  if (!mandirs.length) {
    return (
      <Card>
        <p>
          Sharing a message to Toran is for mandir committees, to add their
          events. If you help run a mandir, ask to look after its page first.
        </p>
        <Link href="/mandirs" className={`${pillButtonClass} self-start`}>
          Find your mandir
        </Link>
      </Card>
    );
  }
  return (
    <Card>
      <h2 className="text-xl font-bold sm:text-2xl">Which mandir is it for?</h2>
      <ul className="flex flex-col gap-2">
        {mandirs.map((m) => (
          <li key={m.slug}>
            <Link href={to(m.slug)} className={pillButtonClass}>
              {m.name}, {m.town}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
