import type { Metadata } from "next";
import { Suspense } from "react";
import { DirectoryList } from "@/components/directory-list";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { MandirsSkeleton } from "@/components/skeletons";
import { Notice } from "@/components/ui";
import { listMandirs } from "@/lib/directory";
import { formatClock, formatWeekday } from "@/lib/format";
import { localePath, pageT } from "@/lib/i18n/page";
import { readSessions, WEEKDAYS } from "@/lib/opening-hours";
import { pageMetadata } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return pageMetadata(
    t("shell.mandirs"),
    t("mandirs.description"),
    localePath("/mandirs"),
  );
}

export default function MandirsPage() {
  const t = pageT();
  return (
    <div className="page-wide flex flex-col gap-6 sm:gap-8">
      <PageHeading title={t("shell.mandirs")} intro={t("mandirs.intro")} />
      <Suspense fallback={<MandirsSkeleton />}>
        <Directory />
      </Suspense>
    </div>
  );
}

async function Directory() {
  const t = pageT();
  const result = await listMandirs();
  if (result.state !== "ok") {
    return <LoadProblem state={result.state} what={t("load.mandirList")} />;
  }
  if (result.data.length === 0) {
    return <Notice>{t("mandirs.none")}</Notice>;
  }
  // Every opening and closing time the list may show, and the day names,
  // ready in the page's language; whether each mandir is open is worked
  // out on the visitor's phone (components/open-now.tsx).
  const clocks = new Set(
    result.data.flatMap((m) =>
      readSessions(m.opening_hours).flatMap((s) => [s.opens, s.closes]),
    ),
  );
  const hours = {
    times: Object.fromEntries([...clocks].map((c) => [c, formatClock(c)])),
    days: Object.fromEntries(
      WEEKDAYS.map((d) => [d, formatWeekday(d, "long")]),
    ),
  };
  return <DirectoryList mandirs={result.data} hours={hours} />;
}
