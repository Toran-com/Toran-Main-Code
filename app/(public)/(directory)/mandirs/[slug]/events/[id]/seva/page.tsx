import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoadProblem } from "@/components/public-shell";
import { SevaRoleCard } from "@/components/seva-rota";
import { ShareButtons } from "@/components/share-buttons";
import {
  getEventSeva,
  getMandir,
  getMandirEvent,
  listMandirs,
} from "@/lib/directory";
import { formatEventStart } from "@/lib/format";
import { placesTaken } from "@/lib/seva";
import { eventPath, sevaPath } from "@/lib/share";
import { pageMetadata, pageTitle } from "@/lib/site";
import { MySlots } from "@/components/seva-slots";
import { localePath, pageT } from "@/lib/i18n/page";

// An event's seva for volunteers: what's needed, how many places are
// taken, and (for each seva the committee has opened) "Take this slot",
// with no name asked (decision 0013). Static like the event page; refreshed when
// the committee changes the rota or someone takes a slot.
export const ensureStatic = "navigation";

const NO_EVENTS = { slug: "no-mandirs-yet", id: "no-events-yet" };

export async function generateStaticParams() {
  const mandirs = await listMandirs();
  if (mandirs.state !== "ok") return [NO_EVENTS];
  const pages = await Promise.all(
    mandirs.data.map(async ({ slug }) => {
      const result = await getMandir(slug);
      return result.state === "ok" && result.data
        ? result.data.events.map((e) => ({ slug, id: e.id }))
        : [];
    }),
  );
  const params = pages.flat();
  return params.length ? params : [NO_EVENTS];
}

export async function generateMetadata({
  params,
}: PageProps<"/mandirs/[slug]/events/[id]/seva">): Promise<Metadata> {
  const { slug, id } = await params;
  const result = await getMandirEvent(slug, id);
  if (result.state !== "ok" || !result.data) return { title: pageTitle() };
  const { event, mandir } = result.data;
  const t = pageT();
  return {
    ...pageMetadata(
      t("seva.pageTitle", { title: event.title, name: mandir.name }),
      t("seva.pageDescription", {
        title: event.title,
        name: mandir.name,
        town: mandir.town,
      }),
      localePath(sevaPath(slug, id)),
    ),
    robots: { index: false, follow: true },
  };
}

export default async function SevaPage({
  params,
}: PageProps<"/mandirs/[slug]/events/[id]/seva">) {
  const { slug, id } = await params;
  const t = pageT();
  const [result, seva] = await Promise.all([
    getMandirEvent(slug, id),
    getEventSeva(slug, id),
  ]);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable" || seva.state === "unavailable") {
    return <LoadProblem state="unavailable" what={t("load.sevaRota")} />;
  }
  if (!result.data || seva.state !== "ok" || !seva.data) notFound();
  const { mandir, event, upcoming } = result.data;
  const roles = seva.data.roles.filter((r) => r.shifts.length);
  if (!roles.length) notFound();
  // Places can be taken while the event is still to come and on, for
  // each seva the committee has opened.
  const live = upcoming && event.status !== "cancelled";
  const open = live && roles.some((r) => r.open);
  const place = [mandir.name, mandir.town, mandir.postcode]
    .filter(Boolean)
    .join(", ");
  const shifts = roles.flatMap((r) => (r.needs_dbs || !r.open ? [] : r.shifts));
  const taken = shifts.reduce((n, s) => n + placesTaken(s), 0);
  const needed = shifts.reduce((n, s) => n + s.needed, 0);

  return (
    <>
      <Link
        href={localePath(eventPath(mandir.slug, event.id))}
        className="text-peacock inline-flex min-h-11 items-center self-start font-semibold hover:underline"
      >
        ← {event.title}
      </Link>
      <div className="rise flex flex-col gap-3">
        <p className="text-marigold-ink text-xl font-semibold">
          {formatEventStart(event.next_starts_at, event.all_day)} ·{" "}
          {mandir.name}
        </p>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          {t("seva.help")}
        </h1>
        {open ? (
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

      <MySlots slug={mandir.slug} event={event.id} />

      {roles.map((role) => (
        <SevaRoleCard
          key={role.id}
          role={role}
          open={live && role.open}
          slug={mandir.slug}
          group={event.id}
          title={event.title}
          place={place}
          path={localePath(sevaPath(mandir.slug, event.id))}
        />
      ))}

      {open && (
        <ShareButtons
          label={t("seva.share")}
          text={t("seva.shareText", {
            title: event.title,
            name: mandir.name,
            free: needed - taken,
          })}
          path={localePath(sevaPath(mandir.slug, event.id))}
        />
      )}
    </>
  );
}
