import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OpsNav } from "@/components/ops-nav";
import { Badge } from "@/components/public-shell";
import {
  inputClass,
  Loading,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { matchesSearch } from "@/lib/format";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: pageTitle("Mandirs · Admin"),
  robots: { index: false },
};

export default function OpsMandirsPage(props: PageProps<"/ops/mandirs">) {
  return (
    <PageShell title="Mandirs" wide>
      <OpsNav current="/ops/mandirs" />
      <Suspense fallback={<Loading />}>
        <MandirList {...props} />
      </Suspense>
    </PageShell>
  );
}

async function MandirList({ searchParams }: PageProps<"/ops/mandirs">) {
  await requireToranAdmin("/ops/mandirs");
  const query = String((await searchParams).q ?? "").trim();
  const supabase = await createSessionClient();
  const { data } = supabase
    ? await supabase
        .from("mandirs")
        .select(
          "slug, name, town, region, tradition, status, postcode, latitude",
        )
        .order("name")
    : { data: [] };
  const mandirs = (data ?? []).filter((m) => matchesSearch(m, query));

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <form className="flex flex-1 gap-2" role="search">
          <label className="sr-only" htmlFor="q">
            Search mandirs
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Name, town or region"
            className={inputClass}
          />
          <button type="submit" className={quietButtonClass}>
            Search
          </button>
        </form>
        <Link href="/ops/mandirs/new" className={quietButtonClass}>
          Add a mandir
        </Link>
      </div>
      <p className="text-muted">
        {mandirs.length} {mandirs.length === 1 ? "mandir" : "mandirs"}
      </p>
      <ul className="border-line bg-surface divide-line shadow-card divide-y rounded-2xl border">
        {mandirs.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/ops/mandirs/${m.slug}`}
              className="hover:bg-sunk flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
            >
              <span className="text-peacock font-semibold">{m.name}</span>
              <span className="text-muted text-base">{m.town}</span>
              {m.status === "hidden" && <Badge tone="kumkum">Hidden</Badge>}
              {m.status === "claimed" && <Badge tone="peacock">Claimed</Badge>}
              {!m.postcode && <Badge>No postcode</Badge>}
              {m.postcode && m.latitude === null && <Badge>Not on map</Badge>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
