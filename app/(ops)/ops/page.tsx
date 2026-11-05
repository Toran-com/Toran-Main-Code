import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, Notice, quietButtonClass } from "@/components/ui";
import { OpsIcon } from "@/components/ops-icon";
import { OpsPage } from "@/components/ops-page";
import { attentionCount, readAttention } from "@/lib/attention";
import { getCurrentUser } from "@/lib/auth";
import { londonDate } from "@/lib/london";
import { OPS_GROUPS } from "@/lib/ops-tools";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { listUpcomingEvents } from "@/lib/whats-on";
import { decideClaim, fillMapPositions } from "./actions";
import { EnrolSecondFactor, VerifySecondFactor } from "./second-factor";

export const metadata: Metadata = {
  title: pageTitle("Admin"),
  robots: { index: false },
};

export default function AdminDashboardPage(props: PageProps<"/ops">) {
  return (
    <OpsPage title="Toran admin">
      <Suspense fallback={<Loading />}>
        <Ops searchParams={props.searchParams} />
      </Suspense>
    </OpsPage>
  );
}

async function Ops({ searchParams }: Pick<PageProps<"/ops">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fops");
  // Hide the admin area's existence from everyone else.
  if (!user.isToranAdmin) notFound();

  if (user.aal !== "aal2") {
    return (
      <Card>
        {user.hasSecondFactor ? <VerifySecondFactor /> : <EnrolSecondFactor />}
      </Card>
    );
  }

  const query = await searchParams;
  const supabase = await createSessionClient();
  const { data: claims, error } = supabase
    ? await supabase.rpc("pending_mandir_claims")
    : { data: null, error: true };
  const [{ count: unmapped }, review, attention, upcoming] = await Promise.all([
    supabase
      ? supabase
          .from("mandirs")
          .select("id", { count: "exact", head: true })
          .not("postcode", "is", null)
          .is("latitude", null)
      : { count: null },
    supabase
      ? supabase
          .from("event_claims")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : { count: null },
    supabase ? supabase.rpc("needs_attention") : null,
    listUpcomingEvents(),
  ]);
  const figures: Figure[] = [
    {
      label: "Waiting for review",
      value: review.count,
      href: "/ops/posters",
      urgent: true,
    },
    {
      label: "Mandir claims to check",
      value: error ? null : (claims?.length ?? 0),
      href: "#claims",
      urgent: true,
    },
    {
      label: "Need attention",
      value:
        attention && !attention.error
          ? attentionCount(readAttention(attention.data))
          : null,
      href: "/ops/attention",
      urgent: true,
    },
    {
      label: "Events coming up",
      value:
        upcoming.state === "ok"
          ? upcoming.data.filter((e) => e.status === "published").length
          : null,
      href: "/whats-on",
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-3xl">{greeting()}</p>
        <p className="bg-leaf/10 text-leaf-ink inline-flex items-center gap-2 rounded-full px-4 py-1 text-base font-semibold">
          <span aria-hidden="true">●</span> Unlocked.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {figures.map((f) => (
          <li key={f.label}>
            <Link
              href={f.href}
              className="border-line bg-surface shadow-card lift flex h-full flex-col gap-2 rounded-3xl border p-5 no-underline"
            >
              <span
                className={`font-display text-5xl leading-none ${
                  f.urgent && f.value ? "text-marigold-ink" : "text-ink"
                }`}
              >
                {f.value ?? "–"}
              </span>
              <span className="text-muted font-semibold">{f.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="tools" className="flex flex-col gap-4">
        <h2 id="tools" className="text-2xl font-bold">
          Tools
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OPS_GROUPS.flatMap((g) => g.tools)
            .filter((tool) => tool.href !== "/ops")
            .map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className="group border-line bg-surface hover:border-peacock/40 flex h-full items-start gap-4 rounded-3xl border p-5 no-underline transition-colors"
                >
                  <span className="bg-night text-night-accent grid size-12 shrink-0 place-items-center rounded-2xl">
                    <OpsIcon name={tool.icon} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-ink group-hover:text-peacock flex items-center gap-2 text-lg font-bold">
                      {tool.label}
                      <span
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                    <span className="text-muted text-base">{tool.about}</span>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>
      {query.error === "claim" && (
        <Notice tone="error">
          That claim couldn&apos;t be decided. It may already have been.
        </Notice>
      )}
      {query.decided && (
        <Notice tone="success">Claim {String(query.decided)}.</Notice>
      )}
      <section aria-labelledby="claims" className="flex flex-col gap-3">
        <h2 id="claims" className="text-2xl font-bold">
          Mandir claims to check
        </h2>
        {error ? (
          <Notice tone="error">Couldn&apos;t load claims.</Notice>
        ) : claims?.length ? (
          <ul className="flex flex-col gap-3">
            {claims.map((c) => (
              <li key={c.id}>
                <Card>
                  <div className="flex flex-col gap-1">
                    <p className="text-xl font-bold">
                      {c.mandir_name}, {c.mandir_town}
                    </p>
                    <p>
                      <span className="break-all">{c.claimant_email}</span> ·{" "}
                      {c.role_at_mandir}
                    </p>
                    {c.message && <p className="text-muted">“{c.message}”</p>}
                    <p className="text-muted text-base">
                      Check with the mandir before approving
                      {c.mandir_phone ? `: ${c.mandir_phone}` : ""}
                      {c.mandir_website ? ` · ${c.mandir_website}` : ""}
                    </p>
                  </div>
                  <form action={decideClaim} className="flex flex-wrap gap-2">
                    <input type="hidden" name="claim" value={c.id} />
                    <button
                      type="submit"
                      name="decision"
                      value="approve"
                      className={quietButtonClass}
                    >
                      Approve
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="reject"
                      className={quietButtonClass}
                    >
                      Reject
                    </button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No claims waiting.</p>
        )}
      </section>
      <section aria-labelledby="positions" className="flex flex-col gap-3">
        <h2 id="positions" className="text-2xl font-bold">
          Map positions
        </h2>
        {query.positions !== undefined && (
          <Notice tone="success">
            Added {String(query.positions)} map positions.
            {Number(query.unknown) > 0 &&
              ` ${String(query.unknown)} postcodes weren't recognised; check them.`}
          </Notice>
        )}
        {(query.error === "positions" || query.error === "postcodes") && (
          <Notice tone="error">
            Couldn&apos;t look up postcodes just now. Please try again later.
          </Notice>
        )}
        {unmapped ? (
          <Card>
            <p>
              {unmapped} {unmapped === 1 ? "mandir has" : "mandirs have"} a
              postcode but no map position yet, so they can&apos;t show
              distances.
            </p>
            <form action={fillMapPositions}>
              <button type="submit" className={quietButtonClass}>
                Fill in map positions
              </button>
            </form>
          </Card>
        ) : (
          <p className="text-muted">
            Every mandir with a postcode has a map position.
          </p>
        )}
      </section>
    </>
  );
}

type Figure = {
  label: string;
  value: number | null | undefined;
  href: string;
  // Gold when there's something waiting.
  urgent?: boolean;
};

// "Good morning · Thursday 5 November", in UK time.
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/London",
    }).format(new Date()),
  );
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${londonDate()}T12:00:00Z`));
  return `${part} · ${day.replace(",", "")}`;
}
