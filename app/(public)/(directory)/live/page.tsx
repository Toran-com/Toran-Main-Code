import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LiveNow } from "@/components/live-now";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { EventListSkeleton } from "@/components/skeletons";
import { localePath, pageT } from "@/lib/i18n/page";
import { formatClock } from "@/lib/format";
import { listLiveSoon } from "@/lib/live";
import { endOf } from "@/lib/live-state";
import { londonTime } from "@/lib/london";
import { pageMetadata } from "@/lib/site";

// Live now (decision 0026): what's on at mandirs at this moment and later
// today. The page comes with the next few days' events; the visitor's
// phone works out which are on now, each minute.

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return pageMetadata(
    t("live.title"),
    t("live.description"),
    localePath("/live"),
  );
}

export default function LivePage() {
  const t = pageT();
  return (
    <div className="page-wide flex flex-col gap-6 sm:gap-8">
      <PageHeading title={t("live.title")} intro={t("live.intro")} />
      <Suspense fallback={<EventListSkeleton />}>
        <Live />
      </Suspense>
      <Link
        href={localePath("/whats-on")}
        className="text-peacock inline-flex min-h-11 items-center self-start font-semibold"
      >
        {t("live.seeAll")} →
      </Link>
    </div>
  );
}

async function Live() {
  const t = pageT();
  const result = await listLiveSoon();
  if (result.state !== "ok") {
    return <LoadProblem state={result.state} what={t("live.what")} />;
  }
  const events = result.data.map((e) => ({
    ...e,
    labels: {
      start: formatClock(londonTime(new Date(e.starts_at))),
      end: formatClock(londonTime(new Date(endOf(e)))),
    },
  }));
  return <LiveNow events={events} />;
}
