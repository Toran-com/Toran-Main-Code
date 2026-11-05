import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MandirImport } from "@/components/mandir-import";
import { Card, Loading } from "@/components/ui";
import { OpsPage } from "@/components/ops-page";
import { requireToranAdmin } from "@/lib/auth";
import { pageTitle } from "@/lib/site";
import { importMandirs } from "../actions";

export const metadata: Metadata = {
  title: pageTitle("Add many mandirs · Admin"),
  robots: { index: false },
};

export default function ImportMandirsPage() {
  return (
    <OpsPage title="Add many mandirs">
      <Suspense fallback={<Loading />}>
        <ImportMandirs />
      </Suspense>
    </OpsPage>
  );
}

async function ImportMandirs() {
  await requireToranAdmin("/ops/mandirs/import");
  return (
    <>
      <Link href="/ops/mandirs" className="text-peacock font-semibold">
        ← All mandirs
      </Link>
      <Card>
        <p className="text-muted">
          Check shows what each row would be: new, a possible duplicate of a
          mandir already listed (the same postcode, website or phone, or a very
          similar name in the same town), or a problem to fix. Only the new ones
          are added, each with its map position from the postcode, and they
          appear on the public list straight away.
        </p>
        <MandirImport action={importMandirs} />
      </Card>
    </>
  );
}
