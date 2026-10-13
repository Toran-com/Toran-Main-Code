import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
  Card,
  Loading,
  Notice,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { decideClaim, fillMapPositions } from "./actions";
import { EnrolSecondFactor, VerifySecondFactor } from "./second-factor";

export const metadata: Metadata = {
  title: pageTitle("Admin"),
  robots: { index: false },
};

export default function OpsPage(props: PageProps<"/ops">) {
  return (
    <PageShell title="Toran admin">
      <Suspense fallback={<Loading />}>
        <Ops searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
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
  const { count: unmapped } = supabase
    ? await supabase
        .from("mandirs")
        .select("id", { count: "exact", head: true })
        .not("postcode", "is", null)
        .is("latitude", null)
    : { count: null };

  return (
    <>
      <p className="text-xl font-semibold">Unlocked.</p>
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
