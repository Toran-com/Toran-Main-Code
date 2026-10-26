import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MandirFields } from "@/components/mandir-fields";
import { OpsNav } from "@/components/ops-nav";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { FORM_ERRORS } from "@/lib/mandir-form";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { removeMandirAdmin, updateMandir } from "../actions";

export const metadata: Metadata = {
  title: pageTitle("Edit mandir · Admin"),
  robots: { index: false },
};

const SAVED: Record<string, string> = {
  "1": "Saved. The public page is updated.",
  added: "Added. It's on the public list now.",
  removed: "Access removed.",
};

export default function EditMandirPage(
  props: PageProps<"/ops/mandirs/[slug]">,
) {
  return (
    <PageShell title="Edit mandir" wide>
      <OpsNav current="/ops/mandirs" />
      <Suspense fallback={<Loading />}>
        <EditMandir {...props} />
      </Suspense>
    </PageShell>
  );
}

async function EditMandir({
  params,
  searchParams,
}: PageProps<"/ops/mandirs/[slug]">) {
  const { slug } = await params;
  await requireToranAdmin(`/ops/mandirs/${slug}`);
  const supabase = await createSessionClient();
  const { data: mandir } = supabase
    ? await supabase
        .from("mandirs")
        .select(
          "id, slug, name, town, region, postcode, website, phone, tradition, calendar, charity_number, status, latitude, getting_there, facilities, visiting_note",
        )
        .eq("slug", slug)
        .maybeSingle()
    : { data: null };
  if (!mandir) notFound();
  const { data: admins } = await supabase!.rpc("mandir_admin_list", {
    target: mandir.id,
  });

  const query = await searchParams;
  const error = FORM_ERRORS[String(query.error ?? "")];
  const saved = SAVED[String(query.saved ?? "")];

  return (
    <>
      <div className="flex flex-wrap gap-4">
        <Link href="/ops/mandirs" className="text-peacock font-semibold">
          ← All mandirs
        </Link>
        {mandir.status !== "hidden" && (
          <Link
            href={`/mandirs/${mandir.slug}`}
            className="text-peacock font-semibold"
          >
            Public page
          </Link>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">{saved}</Notice>}
      {mandir.postcode && mandir.latitude === null && (
        <Notice>
          This postcode wasn&apos;t found on the map. Check it, or use
          &ldquo;Fill in map positions&rdquo; on the overview later.
        </Notice>
      )}

      <Card>
        <form action={updateMandir} className="flex flex-col gap-5">
          <input type="hidden" name="slug" value={mandir.slug} />
          <MandirFields values={mandir} />
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Shown to the public?</span>
            <select
              name="status"
              defaultValue={mandir.status}
              className={inputClass}
            >
              <option value="listed">Listed</option>
              <option value="claimed">Listed, run by its committee</option>
              <option value="hidden">
                Hidden (removed from the public site)
              </option>
            </select>
          </label>
          <button type="submit" className={buttonClass}>
            Save
          </button>
        </form>
      </Card>

      <section aria-labelledby="committee" className="flex flex-col gap-3">
        <h2 id="committee" className="text-2xl font-bold">
          Who looks after this page
        </h2>
        {admins?.length ? (
          <ul className="flex flex-col gap-2">
            {admins.map((a) => (
              <li
                key={a.user_id}
                className="border-line bg-surface shadow-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
              >
                <span className="break-all">{a.email}</span>
                <form action={removeMandirAdmin}>
                  <input type="hidden" name="slug" value={mandir.slug} />
                  <input type="hidden" name="mandir" value={mandir.id} />
                  <input type="hidden" name="member" value={a.user_id} />
                  <button
                    type="submit"
                    className={`${quietButtonClass} px-4 py-2 text-base`}
                  >
                    Remove access
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">
            Nobody yet. Committee members can ask from the public page.
          </p>
        )}
      </section>
    </>
  );
}
