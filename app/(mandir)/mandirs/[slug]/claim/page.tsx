import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
  PageShell,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { submitClaim } from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Look after this mandir's page"),
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  role: "Please say what you do at the mandir (for example Secretary or Trustee).",
  message: "Please keep the note under 500 characters.",
  confirm: "Please tick the box to confirm you're on the committee.",
  duplicate: "You've already asked to look after this mandir's page.",
  failed: "Something went wrong. Please try again.",
};

export default function ClaimPage(props: PageProps<"/mandirs/[slug]/claim">) {
  return (
    <PageShell title="Look after this mandir's page">
      <Suspense fallback={<Loading />}>
        <Claim {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Claim({
  params,
  searchParams,
}: PageProps<"/mandirs/[slug]/claim">) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/mandirs/${slug}/claim`)}`);
  }

  const supabase = await createSessionClient();
  const { data: mandir } = supabase
    ? await supabase
        .from("mandirs")
        .select("id, slug, name, town")
        .eq("slug", slug)
        .maybeSingle()
    : { data: null };
  if (!mandir) notFound();

  const [{ data: admin }, { data: pending }] = await Promise.all([
    supabase!
      .from("mandir_admins")
      .select("mandir_id")
      .eq("mandir_id", mandir.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase!
      .from("mandir_claims")
      .select("id")
      .eq("mandir_id", mandir.id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle(),
  ]);
  const name = `${mandir.name}, ${mandir.town}`;

  if (admin) {
    return (
      <Card>
        <p className="text-lg">You already look after {name}.</p>
        <Link
          href={`/manage/${mandir.slug}`}
          className="text-peacock font-semibold underline"
        >
          Manage its page
        </Link>
      </Card>
    );
  }

  if (pending) {
    return (
      <Card>
        <Notice tone="success">
          Thank you. We&apos;ve got your request for {name}. We&apos;ll check
          with the mandir, usually by phone, and let you know when it&apos;s
          approved.
        </Notice>
        <p className="text-muted">
          Once it is, log in and your mandir&apos;s page is under{" "}
          <Link href="/account" className="text-peacock underline">
            Your account
          </Link>
          .
        </p>
      </Card>
    );
  }

  const query = await searchParams;
  const error = ERRORS[String(query.error ?? "")];

  return (
    <Card>
      <p className="text-lg">
        Committee members can keep <strong>{name}</strong>&apos;s page up to
        date: add events, correct details, and later organise seva.
      </p>
      <p className="text-muted">
        Not this one?{" "}
        <Link href="/join/mandir" className="text-peacock underline">
          Choose another mandir
        </Link>
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      <form action={submitClaim} className="flex flex-col gap-5">
        <input type="hidden" name="slug" value={mandir.slug} />
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Your role at the mandir</span>
          <input
            name="role"
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Secretary, Trustee, Events lead"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Anything that helps us check</span>
          <span className="text-muted text-base">
            Optional. For example, who on the committee we can phone.
          </span>
          <textarea
            name="message"
            maxLength={500}
            rows={3}
            className={inputClass}
          />
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="confirm"
            value="yes"
            required
            className="mt-1.5 size-5 shrink-0"
          />
          <span>
            I&apos;m on this mandir&apos;s committee and allowed to manage its
            listing.
          </span>
        </label>
        <p className="text-muted text-base">
          Our{" "}
          <Link href="/privacy" className="text-peacock underline">
            privacy notice
          </Link>{" "}
          says what we keep and why, and the{" "}
          <Link href="/terms" className="text-peacock underline">
            terms
          </Link>{" "}
          say what you agree to when you look after a page.
        </p>
        <button type="submit" className={buttonClass}>
          Send request
        </button>
      </form>
    </Card>
  );
}
