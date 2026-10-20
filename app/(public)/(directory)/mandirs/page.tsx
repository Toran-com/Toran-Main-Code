import type { Metadata } from "next";
import { Suspense } from "react";
import { DirectoryList } from "@/components/directory-list";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { Loading, Notice } from "@/components/ui";
import { listMandirs } from "@/lib/directory";
import { localePath, pageT } from "@/lib/i18n/page";
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
      <Suspense fallback={<Loading />}>
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
  return <DirectoryList mandirs={result.data} />;
}
