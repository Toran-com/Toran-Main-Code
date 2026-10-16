import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, LoadProblem } from "@/components/public-shell";
import { ShareButtons } from "@/components/share-buttons";
import { Card, Ornament } from "@/components/ui";
import {
  getEventSeva,
  getMandir,
  getMandirEvent,
  listMandirs,
} from "@/lib/directory";
import { formatEventStart } from "@/lib/format";
import { placesTaken, shiftLabel } from "@/lib/seva";
import { eventPath, sevaPath } from "@/lib/share";
import { pageMetadata, pageTitle } from "@/lib/site";
import { MySlots, TakeSlot } from "./slots";

// An event's seva rota for volunteers: what's needed, how many places are
// taken, and (if the committee has turned it on) "Take this slot", with no
// name asked (decision 0013). Static like the event page; refreshed when
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
  return {
    ...pageMetadata(
      `Seva for ${event.title}, ${mandir.name}`,
      `Help with seva for ${event.title} at ${mandir.name}, ${mandir.town}. Take a slot, no sign-up needed.`,
      sevaPath(slug, id),
    ),
    robots: { index: false, follow: true },
  };
}

export default async function SevaPage({
  params,
}: PageProps<"/mandirs/[slug]/events/[id]/seva">) {
  const { slug, id } = await params;
  const [result, seva] = await Promise.all([
    getMandirEvent(slug, id),
    getEventSeva(slug, id),
  ]);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable" || seva.state === "unavailable") {
    return <LoadProblem state="unavailable" what="seva rota" />;
  }
  if (!result.data || seva.state !== "ok" || !seva.data) notFound();
  const { mandir, event, upcoming } = result.data;
  const roles = seva.data.roles.filter((r) => r.shifts.length);
  if (!roles.length) notFound();
  const open = seva.data.open && upcoming && event.status !== "cancelled";
  const place = [mandir.name, mandir.town, mandir.postcode]
    .filter(Boolean)
    .join(", ");
  const shifts = roles.flatMap((r) => (r.needs_dbs ? [] : r.shifts));
  const taken = shifts.reduce((n, s) => n + placesTaken(s), 0);
  const needed = shifts.reduce((n, s) => n + s.needed, 0);

  return (
    <>
      <Link
        href={eventPath(mandir.slug, event.id)}
        className="text-peacock self-start font-semibold hover:underline"
      >
        ← {event.title}
      </Link>
      <div className="rise flex flex-col gap-3">
        <p className="text-marigold-ink text-xl font-semibold">
          {formatEventStart(event.next_starts_at, event.all_day)} ·{" "}
          {mandir.name}
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Help with seva
        </h1>
        <Ornament />
        {open ? (
          <p className="text-xl">
            <strong>
              {taken} of {needed}
            </strong>{" "}
            places taken. Pick a slot below: no sign-up, and Toran doesn&apos;t
            ask your name.
          </p>
        ) : (
          <p className="text-xl">
            Here&apos;s what {mandir.name} needs. To help, reply in the
            mandir&apos;s volunteers&apos; group or ask at the mandir.
          </p>
        )}
      </div>

      <MySlots slug={mandir.slug} event={event.id} />

      {roles.map((role) => (
        <Card key={role.id}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold">{role.name}</h2>
            {role.needs_dbs && <Badge tone="marigold">DBS check needed</Badge>}
          </div>
          {role.description && <p className="text-muted">{role.description}</p>}
          <ul className="flex flex-col gap-3">
            {role.shifts.map((shift) => {
              const done = placesTaken(shift);
              const full = done >= shift.needed;
              const label = shiftLabel(shift.starts_at, shift.ends_at);
              return (
                <li
                  key={shift.id}
                  className="border-line flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                >
                  <div className="flex min-w-48 flex-1 flex-col gap-1">
                    <span className="font-semibold">{label}</span>
                    <span
                      className="bg-sunk h-2.5 overflow-hidden rounded-full"
                      aria-hidden="true"
                    >
                      <span
                        className={`block h-full rounded-full ${full ? "bg-peacock" : "bg-marigold"}`}
                        style={{ width: `${(done / shift.needed) * 100}%` }}
                      />
                    </span>
                    <span className="text-muted text-base">
                      {done} of {shift.needed} taken
                    </span>
                  </div>
                  {open && !role.needs_dbs && (
                    <TakeSlot
                      slug={mandir.slug}
                      full={full}
                      details={{
                        shift: shift.id,
                        event: event.id,
                        role: role.name,
                        label,
                        starts_at: shift.starts_at,
                        ends_at: shift.ends_at,
                        title: event.title,
                        place,
                        path: sevaPath(mandir.slug, event.id),
                      }}
                    />
                  )}
                  {open && role.needs_dbs && (
                    <p className="text-muted text-base">
                      Ask the committee: the mandir checks DBS
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      {open && (
        <ShareButtons
          label="Share this rota"
          text={`Seva for ${event.title} at ${mandir.name}: ${needed - taken} places still free. Take a slot, no sign-up needed:`}
          path={sevaPath(mandir.slug, event.id)}
        />
      )}
    </>
  );
}
