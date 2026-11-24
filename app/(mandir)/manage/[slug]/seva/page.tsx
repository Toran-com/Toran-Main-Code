import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CommitteeBar } from "@/components/committee-bar";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyText } from "@/components/copy-text";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/public-shell";
import {
  type SevaEventChoice,
  SevaEventAndTime,
} from "@/components/seva-event-time";
import { Sheet } from "@/components/sheet";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
  pillButtonClass,
  quietButtonClass,
} from "@/components/ui";
import { upcomingFilter, withNextStart } from "@/lib/events";
import { formatEventStart } from "@/lib/format";
import { londonDate, londonTime } from "@/lib/london";
import { requireMandirAccess } from "@/lib/manage-access";
import {
  placesTaken,
  rotaMessage,
  SEVA_ERRORS,
  sevaRoundup,
  shiftLabel,
  stillShort,
} from "@/lib/seva";
import { sevaPagePath } from "@/lib/share";
import { pageTitle, siteUrl } from "@/lib/site";
import {
  addSeva,
  addShift,
  changeCount,
  changeSeva,
  clearOnlineSlots,
  removeSeva,
  setSevaOpen,
} from "./actions";

// The committee's seva: add what's needed (Kitchen, Parking, Shoes), when
// and how many people, optionally for one of its events, then send it to
// the volunteers' WhatsApp group or let volunteers take a place on Toran.
// Numbers only: Toran never keeps a volunteer's name (decision 0013).

export const metadata: Metadata = {
  title: pageTitle("Seva"),
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  ...SEVA_ERRORS,
  failed: "Something went wrong. Please try again.",
};

const DONE: Record<string, string> = {
  added: "Seva added. Send it to your volunteers below.",
  changed: "Seva changed.",
  shift: "Time added.",
  removed: "Removed.",
  open: "Volunteers can now take places on Toran.",
  closed: "Volunteers can no longer take places on Toran.",
  count: "Count updated.",
  cleared: "Places taken on Toran for that time were cleared.",
};

const linkButton =
  "inline-flex min-h-11 cursor-pointer items-center text-base font-semibold underline underline-offset-2";

export default function SevaOverviewPage(
  props: PageProps<"/manage/[slug]/seva">,
) {
  return (
    <PageShell title="Seva" wide>
      <Suspense fallback={<Loading />}>
        <Overview {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Overview({
  params,
  searchParams,
}: PageProps<"/manage/[slug]/seva">) {
  const { slug } = await params;
  const { supabase, mandir } = await requireMandirAccess(
    slug,
    `/manage/${slug}/seva`,
  );
  // What's short depends on the time now.
  await connection();
  const now = new Date();
  const at = now.toISOString();
  const from = `${londonDate()}T00:00:00Z`;

  const [{ data: eventRows }, { data: sevaRows }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, starts_at, ends_at, all_day, recurrence, status, event_occurrences (starts_at, cancelled)",
      )
      .eq("mandir_id", mandir.id)
      .in("status", ["published", "draft"])
      .or(upcomingFilter(from))
      .order("starts_at")
      .limit(100),
    supabase
      .from("seva_roles")
      .select(
        "id, name, description, needs_dbs, open, event_id, created_at, event:events (id, title, status, starts_at, all_day), seva_shifts (id, starts_at, ends_at, needed, filled_offline, taken_online)",
      )
      .eq("mandir_id", mandir.id)
      .order("created_at"),
  ]);

  // The coming events a seva can be for, with when each next starts and
  // ends, for the add form to put in.
  const events = withNextStart(eventRows ?? [], from);
  const coming = new Map(events.map((e) => [e.id, e]));
  const choices: SevaEventChoice[] = events.map((e) => {
    const start = new Date(e.next_starts_at);
    const end = e.ends_at
      ? new Date(
          start.getTime() + (Date.parse(e.ends_at) - Date.parse(e.starts_at)),
        )
      : null;
    return {
      id: e.id,
      title: e.title,
      label: `${e.title} · ${formatEventStart(e.next_starts_at, e.all_day)}${e.status === "draft" ? " (not published)" : ""}`,
      date: londonDate(start),
      from: e.all_day ? "" : londonTime(start),
      to: end && !e.all_day ? londonTime(end) : "",
    };
  });

  // Seva still to come (or with no times yet), soonest first.
  const seva = (sevaRows ?? [])
    .map((r) => {
      const shifts = [...r.seva_shifts].sort((a, b) =>
        a.starts_at.localeCompare(b.starts_at),
      );
      const event = r.event_id ? coming.get(r.event_id) : undefined;
      const rota = [{ ...r, shifts }];
      const ahead = shifts.filter((s) => s.ends_at > at);
      const live = r.open && (!r.event || r.event.status === "published");
      return {
        ...r,
        shifts,
        // When it's for an event: the event's title and when it's next on.
        forEvent: r.event
          ? {
              title: r.event.title,
              when: formatEventStart(
                event?.next_starts_at ?? r.event.starts_at,
                r.event.all_day,
              ),
            }
          : null,
        sortBy: ahead[0]?.starts_at ?? event?.next_starts_at ?? r.created_at,
        keep:
          ahead.length > 0 ||
          (!shifts.length && (!r.event_id || coming.has(r.event_id))),
        needed: ahead.reduce((n, s) => n + s.needed, 0),
        taken: ahead.reduce((n, s) => n + placesTaken(s), 0),
        short: stillShort(rota, now),
        // Its volunteers' page, when volunteers can take places there.
        link: live ? `${siteUrl()}${sevaPagePath(mandir.slug, r)}` : null,
        rota,
      };
    })
    .filter((r) => r.keep)
    .sort((a, b) => a.sortBy.localeCompare(b.sortBy));

  // Everything still short in one message: an event's seva together.
  type Group = Parameters<typeof sevaRoundup>[1][number];
  const groups = new Map<string, Group>();
  for (const r of seva) {
    if (!r.short.length) continue;
    const key = r.event_id ?? r.id;
    const group: Group = groups.get(key) ?? {
      title: r.forEvent?.title ?? null,
      when: r.forEvent?.when ?? "",
      link: r.link,
      short: [],
    };
    group.short = [...group.short, ...r.short].sort((a, b) =>
      a.startsAt.localeCompare(b.startsAt),
    );
    group.link ??= r.link;
    groups.set(key, group);
  }
  const shortShifts = seva.reduce((n, r) => n + r.short.length, 0);
  const roundup = sevaRoundup(
    mandir.name,
    [...groups.values()].sort((a, b) =>
      a.short[0].startsAt.localeCompare(b.short[0].startsAt),
    ),
  );

  const query = await searchParams;
  // Each time the page is drawn afresh, so a sheet closes once its form
  // is sent (components/sheet.tsx).
  const stamp = new Date().getTime();
  const error = ERRORS[String(query.error ?? "")];
  const done = DONE[String(query.done ?? "")];
  // From an event's menu ("Add seva"): the add form, with the event chosen.
  const chosen = String(query.event ?? "");
  const openAdd =
    query.open === "add-seva" || (!!chosen && coming.has(chosen) && !done);
  const hidden = <input type="hidden" name="slug" value={mandir.slug} />;

  return (
    <>
      <CommitteeBar slug={mandir.slug} current="seva" />
      <div className="flex flex-col gap-2">
        <Link
          href={`/manage/${mandir.slug}`}
          className="text-peacock inline-flex min-h-11 items-center self-start font-semibold"
        >
          ← {mandir.name}
        </Link>
        <p className="text-muted">
          Ask for the seva you need: what it is, when, and how many people. Link
          it to one of your events if it&apos;s for one. Send it to your
          volunteers&apos; WhatsApp group, or let them take a place on Toran
          without giving a name. Seva open on Toran also shows on Toran&apos;s{" "}
          <Link href="/seva" className="text-peacock underline">
            Seva page
          </Link>
          , where volunteers near you can find it.
        </p>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      <Sheet
        id="add-seva"
        title="Add seva"
        open={openAdd}
        stamp={stamp}
        triggerClass={`${buttonClass} sm:w-auto sm:self-start`}
        trigger={
          <>
            <span aria-hidden="true">+</span> Add seva
          </>
        }
      >
        <form
          action={addSeva}
          className="grid grid-cols-2 items-end gap-4"
          aria-label="Add seva"
        >
          {hidden}
          <input type="hidden" name="mandir" value={mandir.id} />
          <label className="col-span-2 flex flex-col gap-2">
            <span className="font-semibold">What&apos;s the seva?</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={60}
              placeholder="e.g. Kitchen, Parking, Shoes, Cleaning"
              className={inputClass}
            />
          </label>
          <label className="col-span-2 flex flex-col gap-2">
            <span className="font-semibold">What it involves (optional)</span>
            <input
              name="description"
              maxLength={280}
              placeholder="e.g. Serving prasad after aarti"
              className={inputClass}
            />
          </label>
          <SevaEventAndTime events={choices} chosen={chosen} />
          <label className="col-span-2 flex flex-col gap-1">
            <span className="font-semibold">People needed</span>
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
          <label className="col-span-2 flex items-start gap-3">
            <input
              name="open"
              type="checkbox"
              defaultChecked
              className="mt-1.5 size-5"
            />
            <span>
              Let volunteers take a place on Toran, with no sign-up and no name.
              You see how many are coming, not who.
            </span>
          </label>
          <label className="col-span-2 flex items-start gap-3">
            <input name="dbs" type="checkbox" className="mt-1.5 size-5" />
            <span>
              Needs a DBS check, for example working with children. The mandir
              checks this; Toran never sees certificates.
            </span>
          </label>
          <button type="submit" className={`${buttonClass} col-span-2`}>
            Add seva
          </button>
        </form>
      </Sheet>

      {seva.length ? (
        <section aria-labelledby="coming" className="flex flex-col gap-4">
          <h2 id="coming" className="text-xl font-bold sm:text-2xl">
            {shortShifts
              ? `${shortShifts} ${shortShifts === 1 ? "time" : "times"} still short`
              : "Every place is filled"}
          </h2>
          <ul className="flex flex-col gap-4">
            {seva.map((r) => {
              const message = rotaMessage(
                r.forEvent?.title ?? mandir.name,
                r.forEvent?.when ?? null,
                r.rota,
                !!r.link,
              );
              const send = r.link ? `${message}\n${r.link}` : message;
              const last = r.shifts.at(-1);
              return (
                <li key={r.id}>
                  <Card>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold sm:text-2xl">
                        {r.name}
                      </h3>
                      {r.needs_dbs && (
                        <Badge tone="marigold">DBS check needed</Badge>
                      )}
                    </div>
                    <p className="text-marigold-ink font-semibold">
                      {r.forEvent
                        ? `For ${r.forEvent.title} · ${r.forEvent.when}`
                        : "On its own, not for an event"}
                    </p>
                    {r.description && (
                      <p className="text-muted">{r.description}</p>
                    )}
                    <p className="flex flex-wrap items-center gap-2">
                      {r.needed > 0 && (
                        <Badge tone={r.short.length ? "marigold" : "leaf"}>
                          {r.taken} of {r.needed} places filled
                        </Badge>
                      )}
                      {r.event?.status === "draft" ? (
                        <Badge>Its event isn&apos;t published yet</Badge>
                      ) : r.open ? (
                        <Badge tone="peacock">Open on Toran</Badge>
                      ) : (
                        <Badge>Not open on Toran</Badge>
                      )}
                    </p>

                    {r.shifts.length ? (
                      <ul className="flex flex-col gap-2">
                        {r.shifts.map((s) => {
                          const label = shiftLabel(s.starts_at, s.ends_at);
                          return (
                            <li
                              key={s.id}
                              className="border-line flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2"
                            >
                              <span className="flex flex-col">
                                <span>
                                  {label} ·{" "}
                                  <strong>
                                    {placesTaken(s)} of {s.needed} taken
                                  </strong>
                                </span>
                                <span className="text-muted text-base">
                                  {s.filled_offline} counted by you
                                  {s.taken_online > 0 &&
                                    `, ${s.taken_online} on Toran`}
                                </span>
                              </span>
                              <span className="flex flex-wrap items-center gap-2">
                                <form action={changeCount}>
                                  {hidden}
                                  <input type="hidden" name="id" value={s.id} />
                                  <input
                                    type="hidden"
                                    name="step"
                                    value="down"
                                  />
                                  <button
                                    type="submit"
                                    disabled={s.filled_offline === 0}
                                    aria-label={`One fewer counted by you, ${r.name}, ${label}`}
                                    className={`${quietButtonClass} px-3 py-1 text-base`}
                                  >
                                    −
                                  </button>
                                </form>
                                <form action={changeCount}>
                                  {hidden}
                                  <input type="hidden" name="id" value={s.id} />
                                  <input type="hidden" name="step" value="up" />
                                  <button
                                    type="submit"
                                    disabled={placesTaken(s) >= s.needed}
                                    aria-label={`One more counted by you, ${r.name}, ${label}`}
                                    className={`${quietButtonClass} px-3 py-1 text-base`}
                                  >
                                    +
                                  </button>
                                </form>
                                {s.taken_online > 0 && (
                                  <form action={clearOnlineSlots}>
                                    {hidden}
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={s.id}
                                    />
                                    <ConfirmButton
                                      question="Clear the places taken on Toran for this time? Do this only if they look wrong."
                                      className={`text-kumkum ${linkButton}`}
                                    >
                                      Clear Toran places
                                    </ConfirmButton>
                                  </form>
                                )}
                              </span>
                              <form action={removeSeva}>
                                {hidden}
                                <input
                                  type="hidden"
                                  name="kind"
                                  value="shift"
                                />
                                <input type="hidden" name="id" value={s.id} />
                                <button
                                  type="submit"
                                  className={`text-kumkum ${linkButton}`}
                                >
                                  Remove
                                  <span className="sr-only"> {label}</span>
                                </button>
                              </form>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-muted">No times yet.</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <Sheet
                        id={`send-${r.id}`}
                        title={`Send ${r.name} to volunteers`}
                        stamp={stamp}
                        triggerClass={pillButtonClass}
                        trigger="Send to volunteers"
                      >
                        <p className="text-muted">
                          This is the message your volunteers&apos; group will
                          see:
                        </p>
                        <pre className="bg-sunk rounded-xl p-4 font-sans text-base whitespace-pre-wrap">
                          {send}
                        </pre>
                        <div className="flex flex-wrap items-center gap-4">
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(send)}`}
                            className={quietButtonClass}
                          >
                            Send on WhatsApp
                          </a>
                          <CopyText text={send} label="Copy the message" />
                        </div>
                      </Sheet>
                      <Sheet
                        id={`time-${r.id}`}
                        title={`Add a time to ${r.name}`}
                        stamp={stamp}
                        triggerClass={pillButtonClass}
                        trigger={
                          <>
                            <span aria-hidden="true">+</span> Add a time
                          </>
                        }
                      >
                        <form
                          action={addShift}
                          className="grid grid-cols-2 items-end gap-3"
                          aria-label={`Add a time to ${r.name}`}
                        >
                          {hidden}
                          <input type="hidden" name="role" value={r.id} />
                          <label className="col-span-2 flex flex-col gap-1">
                            <span className="font-semibold">Day</span>
                            <input
                              name="date"
                              type="date"
                              required
                              defaultValue={
                                last
                                  ? londonDate(new Date(last.starts_at))
                                  : (choices.find((e) => e.id === r.event_id)
                                      ?.date ?? "")
                              }
                              className={inputClass}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="font-semibold">From</span>
                            <input
                              name="from"
                              type="time"
                              required
                              className={inputClass}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="font-semibold">To</span>
                            <input
                              name="to"
                              type="time"
                              required
                              className={inputClass}
                            />
                          </label>
                          <label className="col-span-2 flex flex-col gap-1">
                            <span className="font-semibold">People needed</span>
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
                            className={`${buttonClass} col-span-2`}
                          >
                            Add time
                          </button>
                        </form>
                      </Sheet>
                      <Sheet
                        id={`change-${r.id}`}
                        title={`Change ${r.name}`}
                        stamp={stamp}
                        triggerClass={pillButtonClass}
                        trigger="Change"
                        triggerLabel={`Change ${r.name}`}
                      >
                        <form
                          action={changeSeva}
                          className="flex flex-col gap-4"
                          aria-label={`Change ${r.name}`}
                        >
                          {hidden}
                          <input type="hidden" name="id" value={r.id} />
                          <label className="flex flex-col gap-2">
                            <span className="font-semibold">
                              What&apos;s the seva?
                            </span>
                            <input
                              name="name"
                              required
                              minLength={2}
                              maxLength={60}
                              defaultValue={r.name}
                              className={inputClass}
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="font-semibold">
                              What it involves (optional)
                            </span>
                            <input
                              name="description"
                              maxLength={280}
                              defaultValue={r.description ?? ""}
                              className={inputClass}
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="font-semibold">
                              Is it for one of your events?
                            </span>
                            <select
                              name="event"
                              defaultValue={r.event_id ?? ""}
                              className={inputClass}
                            >
                              <option value="">No, it&apos;s on its own</option>
                              {r.event_id && !coming.has(r.event_id) && (
                                <option value={r.event_id}>
                                  {r.forEvent?.title ?? "Its event"}
                                </option>
                              )}
                              {choices.map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-muted text-base">
                              Its times stay as they are.
                            </span>
                          </label>
                          <label className="flex items-start gap-3">
                            <input
                              name="dbs"
                              type="checkbox"
                              defaultChecked={r.needs_dbs}
                              className="mt-1.5 size-5"
                            />
                            <span>Needs a DBS check</span>
                          </label>
                          <button type="submit" className={buttonClass}>
                            Save
                          </button>
                        </form>
                      </Sheet>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <form action={setSevaOpen}>
                        {hidden}
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          type="hidden"
                          name="open"
                          value={r.open ? "no" : "yes"}
                        />
                        <button
                          type="submit"
                          className={`text-peacock ${linkButton}`}
                        >
                          {r.open
                            ? "Stop taking places on Toran"
                            : "Let volunteers take places on Toran"}
                        </button>
                      </form>
                      <form action={removeSeva}>
                        {hidden}
                        <input type="hidden" name="kind" value="seva" />
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmButton
                          question={`Remove "${r.name}" and its times?`}
                          className={`text-kumkum ${linkButton}`}
                        >
                          Remove {r.name}
                        </ConfirmButton>
                      </form>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <Card>
          <h2 className="text-xl font-bold sm:text-2xl">No seva yet</h2>
          <p className="text-muted">
            Press Add seva and say what&apos;s needed (Kitchen, Parking, Shoes),
            when, and how many people. If it&apos;s for one of your events,
            choose it and its time is put in for you.
          </p>
        </Card>
      )}

      {shortShifts > 0 && (
        <Card>
          <h2 className="text-xl font-bold sm:text-2xl">
            One message for your volunteers
          </h2>
          <p className="text-muted">
            Everything still short, ready for your volunteers&apos; WhatsApp
            group.
          </p>
          <p className="bg-sunk rounded-2xl p-4 whitespace-pre-line">
            {roundup}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(roundup)}`}
              className={quietButtonClass}
            >
              Send on WhatsApp
            </a>
            <CopyText text={roundup} label="Copy the message" />
          </div>
        </Card>
      )}
    </>
  );
}
