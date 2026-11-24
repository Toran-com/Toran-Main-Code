import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LoadProblem } from "@/components/public-shell";
import { SevaRoleCard } from "@/components/seva-rota";
import { MySlots } from "@/components/seva-slots";
import { ShareButtons } from "@/components/share-buttons";
import { getMandir, getOwnSeva, listOwnSeva } from "@/lib/directory";
import { localePath, pageT } from "@/lib/i18n/page";
import { placesTaken } from "@/lib/seva";
import { ownSevaPath, sevaPath } from "@/lib/share";
import { pageMetadata, pageTitle } from "@/lib/site";

// A seva that isn't for an event (say, Sunday cleaning), for volunteers:
// its times, how many places are taken, and "Take this slot" if the
// committee lets volunteers take places on Toran, with no name asked
// (decision 0013). Seva for an event is on the event's seva page.
export const ensureStatic = "navigation";

const NO_SEVA = { slug: "no-mandirs-yet", id: "no-seva-yet" };

export async function generateStaticParams() {
  const seva = await listOwnSeva();
  if (seva.state !== "ok" || !seva.data.length) return [NO_SEVA];
  return seva.data;
}

export async function generateMetadata({
  params,
}: PageProps<"/mandirs/[slug]/seva/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const [mandir, seva] = await Promise.all([
    getMandir(slug),
    getOwnSeva(slug, id),
  ]);
  if (mandir.state !== "ok" || !mandir.data) return { title: pageTitle() };
  if (seva.state !== "ok" || !seva.data) return { title: pageTitle() };
  const t = pageT();
  const { name, town } = mandir.data;
  const title = seva.data.role.name;
  return {
    ...pageMetadata(
      t("seva.pageTitle", { title, name }),
      t("seva.pageDescription", { title, name, town }),
      localePath(ownSevaPath(slug, id)),
    ),
    robots: { index: false, follow: true },
  };
}

export default async function OwnSevaPage({
  params,
}: PageProps<"/mandirs/[slug]/seva/[id]">) {
  const { slug, id } = await params;
  const t = pageT();
  const [result, seva] = await Promise.all([
    getMandir(slug),
    getOwnSeva(slug, id),
  ]);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable" || seva.state === "unavailable") {
    return <LoadProblem state="unavailable" what={t("load.sevaRota")} />;
  }
  if (!result.data || seva.state !== "ok" || !seva.data) notFound();
  // Since linked to an event: its seva is on the event's page.
  if (seva.data.eventId) {
    redirect(localePath(sevaPath(slug, seva.data.eventId)));
  }
  const mandir = result.data;
  const { role, upcoming } = seva.data;
  if (!role.shifts.length) notFound();
  const open = role.open && upcoming;
  const place = [mandir.name, mandir.town, mandir.postcode]
    .filter(Boolean)
    .join(", ");
  const shifts = role.needs_dbs ? [] : role.shifts;
  const taken = shifts.reduce((n, s) => n + placesTaken(s), 0);
  const needed = shifts.reduce((n, s) => n + s.needed, 0);
  const path = localePath(ownSevaPath(mandir.slug, role.id));

  return (
    <>
      <Link
        href={localePath(`/mandirs/${mandir.slug}`)}
        className="text-peacock inline-flex min-h-11 items-center self-start font-semibold hover:underline"
      >
        ← {mandir.name}
      </Link>
      <div className="rise flex flex-col gap-3">
        <p className="text-marigold-ink text-xl font-semibold">
          {mandir.name}, {mandir.town}
        </p>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          {t("seva.help")}
        </h1>
        {open && needed > 0 ? (
          <p className="text-xl">
            <strong>{t("seva.takenOf", { taken, needed })}</strong>{" "}
            {t("seva.pickBelow")}
          </p>
        ) : (
          <p className="text-xl">
            {t("seva.closedNote", { name: mandir.name })}
          </p>
        )}
      </div>

      <MySlots slug={mandir.slug} event={role.id} />

      <SevaRoleCard
        role={role}
        open={open}
        slug={mandir.slug}
        group={role.id}
        title={role.name}
        place={place}
        path={path}
      />

      {open && needed > 0 && (
        <ShareButtons
          label={t("seva.share")}
          text={t("seva.shareText", {
            title: role.name,
            name: mandir.name,
            free: needed - taken,
          })}
          path={path}
        />
      )}
    </>
  );
}
