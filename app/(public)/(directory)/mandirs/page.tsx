import type { Metadata } from "next";
import { Suspense } from "react";
import { DirectoryList } from "@/components/directory-list";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { Loading, Notice } from "@/components/ui";
import { listMandirs } from "@/lib/directory";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata(
  "Mandirs",
  "Hindu mandirs across the UK, by region and town.",
  "/mandirs",
);

export default function MandirsPage() {
  return (
    <>
      <PageHeading
        title="Mandirs"
        intro="Hindu mandirs across the UK. Find yours to see what's on."
      />
      <Suspense fallback={<Loading />}>
        <Directory />
      </Suspense>
    </>
  );
}

async function Directory() {
  const result = await listMandirs();
  if (result.state !== "ok") {
    return <LoadProblem state={result.state} what="mandir list" />;
  }
  if (result.data.length === 0) {
    return <Notice>No mandirs are listed yet.</Notice>;
  }
  return <DirectoryList mandirs={result.data} />;
}
