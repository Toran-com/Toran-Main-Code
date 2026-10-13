import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MandirFields } from "@/components/mandir-fields";
import { OpsNav } from "@/components/ops-nav";
import { buttonClass, Card, Loading, Notice, PageShell } from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { FORM_ERRORS } from "@/lib/mandir-form";
import { pageTitle } from "@/lib/site";
import { createMandir } from "../actions";

export const metadata: Metadata = {
  title: pageTitle("Add a mandir · Admin"),
  robots: { index: false },
};

export default function NewMandirPage(props: PageProps<"/ops/mandirs/new">) {
  return (
    <PageShell title="Add a mandir" wide>
      <OpsNav current="/ops/mandirs" />
      <Suspense fallback={<Loading />}>
        <NewMandir {...props} />
      </Suspense>
    </PageShell>
  );
}

async function NewMandir({ searchParams }: PageProps<"/ops/mandirs/new">) {
  await requireToranAdmin("/ops/mandirs/new");
  const error = FORM_ERRORS[String((await searchParams).error ?? "")];
  return (
    <>
      <Link href="/ops/mandirs" className="text-peacock font-semibold">
        ← All mandirs
      </Link>
      {error && <Notice tone="error">{error}</Notice>}
      <Card>
        <p className="text-muted">
          Public details only: no committee members&apos; names, emails or
          mobile numbers. It appears on the public list straight away.
        </p>
        <form action={createMandir} className="flex flex-col gap-5">
          <MandirFields />
          <button type="submit" className={buttonClass}>
            Add mandir
          </button>
        </form>
      </Card>
    </>
  );
}
