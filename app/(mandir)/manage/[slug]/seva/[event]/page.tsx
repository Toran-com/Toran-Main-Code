import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge } from "@/components/public-shell";
import { ShareButtons } from "@/components/share-buttons";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { withNextStart } from "@/lib/events";
import { formatEventStart, londonDate } from "@/lib/format";
import { requireMandirAccess } from "@/lib/manage-access";
import { eventPath } from "@/lib/share";
import { rotaMessage, SEVA_ERRORS, shiftLabel } from "@/lib/seva";
import { pageTitle } from "@/lib/site";
import { addRole, addShift, removeFromRota } from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Seva rota"),
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  ...SEVA_ERRORS,
  failed: "Something went wrong. Please try again.",
};

const DONE: Record<string, string> = {
  role: "Role added. Now add its shifts.",
  shift: "Shift added.",
  removed: "Removed.",
};

export default function SevaPage(
  props: PageProps<"/manage/[slug]/seva/[event]">,
) {
  return (
    <PageShell title="Seva rota">
      <Suspense fallback={<Loading />}>
        <Seva {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Seva({
  params,
  searchParams,
}: PageProps<"/manage/[slug]/seva/[event]">) {
  const { slug, event: eventId } = await params;
  const { supabase, mandir } = await requireMandirAccess(
    slug,
    `/manage/${slug}/seva/${eventId}`,
  );

  const from = `${londonDate()}T00:00:00Z`;
  const { data: row } = await supabase
    .from("events")
    .select(
      "id, title, starts_at, all_day, recurrence, status, event_occurrences (starts_at, cancelled)",
    )
    .eq("id", eventId)
    .eq("mandir_id", mandir.id)
    .neq("status", "removed")
    .maybeSingle();
  if (!row) notFound();
  const [event] = withNextStart([row], from);
  const when = formatEventStart(event.next_starts_at, event.all_day);
  const eventDay = londonDate(new Date(event.next_starts_at));

  const { data: roles } = await supabase
    .from("seva_roles")
    .select(
      "id, name, description, needs_dbs, seva_shifts (id, starts_at, ends_at, needed)",
    )
    .eq("event_id", event.id)
    .order("created_at");
  const rota = (roles ?? []).map((r) => ({
    ...r,
    shifts: [...r.seva_shifts].sort((a, b) =>
      a.starts_at.localeCompare(b.starts_at),
    ),
  }));
  const hasShifts = rota.some((r) => r.shifts.length);

  const query = await searchParams;
  const error = ERRORS[String(query.error ?? "")];
  const done = DONE[String(query.done ?? "")];
  const hidden = (
    <>
      <input type="hidden" name="slug" value={mandir.slug} />
      <input type="hidden" name="event" value={event.id} />
    </>
  );

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link
          href={`/manage/${mandir.slug}`}
          className="text-peacock self-start font-semibold"
        >
          ← {mandir.name}
        </Link>
        <p className="text-2xl font-bold">{event.title}</p>
        <p className="text-marigold-ink font-semibold">{when}</p>
      </div>
      <p className="text-muted">
        Plan the seva this event needs, then send the rota to your
        volunteers&apos; WhatsApp group. People reply there as usual: Toran
        doesn&apos;t keep anyone&apos;s name.
      </p>

      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      {rota.map((role) => (
        <Card key={role.id}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold">{role.name}</h2>
            {role.needs_dbs && <Badge tone="marigold">DBS check needed</Badge>}
          </div>
          {role.description && <p className="text-muted">{role.description}</p>}
          {role.shifts.length ? (
            <ul className="flex flex-col gap-2">
              {role.shifts.map((s) => (
                <li
                  key={s.id}
                  className="border-line flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2"
                >
                  <span>
                    {shiftLabel(s.starts_at, s.ends_at)} ·{" "}
                    <strong>
                      {s.needed} {s.needed === 1 ? "person" : "people"}
                    </strong>
                  </span>
                  <form action={removeFromRota}>
                    {hidden}
                    <input type="hidden" name="kind" value="shift" />
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="text-kumkum cursor-pointer text-base font-semibold underline"
                    >
                      Remove<span className="sr-only"> shift</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No shifts yet.</p>
          )}
          <form
            action={addShift}
            className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] sm:items-end"
            aria-label={`Add a shift to ${role.name}`}
          >
            {hidden}
            <input type="hidden" name="role" value={role.id} />
            <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <span className="text-base font-semibold">Day</span>
              <input
                name="date"
                type="date"
                required
                defaultValue={eventDay}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-base font-semibold">From</span>
              <input name="from" type="time" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-base font-semibold">To</span>
              <input name="to" type="time" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-base font-semibold">People</span>
              <input
                name="needed"
                type="number"
                min={1}
                max={500}
                required
                defaultValue={2}
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              className={`${quietButtonClass} px-4 py-2 text-base`}
            >
              Add shift
            </button>
          </form>
          <form action={removeFromRota}>
            {hidden}
            <input type="hidden" name="kind" value="role" />
            <input type="hidden" name="id" value={role.id} />
            <ConfirmButton
              question={`Remove "${role.name}" and its shifts?`}
              className="text-kumkum cursor-pointer text-base font-semibold underline"
            >
              Remove {role.name}
            </ConfirmButton>
          </form>
        </Card>
      ))}

      <Card>
        <h2 className="text-2xl font-bold">
          {rota.length ? "Add another role" : "Add a role"}
        </h2>
        <form action={addRole} className="flex flex-col gap-4">
          {hidden}
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Role</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={60}
              placeholder="e.g. Kitchen, Parking, Shoes"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">What it involves (optional)</span>
            <input
              name="description"
              maxLength={280}
              placeholder="e.g. Serving prasad after aarti"
              className={inputClass}
            />
          </label>
          <label className="flex items-start gap-3">
            <input name="dbs" type="checkbox" className="mt-1.5 size-5" />
            <span>
              Needs a DBS check, for example working with children. The mandir
              checks this; Toran never sees certificates.
            </span>
          </label>
          <button type="submit" className={buttonClass}>
            Add role
          </button>
        </form>
      </Card>

      {hasShifts && (
        <Card>
          <h2 className="text-2xl font-bold">Send the rota</h2>
          <p className="text-muted">
            This is the message your volunteers&apos; group will see:
          </p>
          <pre className="bg-sunk rounded-xl p-4 font-sans text-base whitespace-pre-wrap">
            {rotaMessage(event.title, when, rota)}
          </pre>
          <ShareButtons
            label="Send"
            text={rotaMessage(event.title, when, rota)}
            path={eventPath(mandir.slug, event.id)}
          />
        </Card>
      )}
    </>
  );
}
