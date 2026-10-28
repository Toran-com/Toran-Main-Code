"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { DateTileView } from "@/components/date-tile-view";
import {
  calendarEntry,
  downloadCalendar,
  type MySlot,
  MySlotItem,
  slotMandir,
  takeAndKeep,
  useMySlots,
} from "@/components/seva-slots";
import { buttonClass, quietButtonClass } from "@/components/ui";
import { useOrigin } from "@/components/use-origin";
import { useT } from "@/components/use-t";
import type { Position } from "@/lib/geo";
import { googleCalendarLink } from "@/lib/ical";
import { enSeva } from "@/lib/i18n/client/seva";
import { enSlots } from "@/lib/i18n/client/slots";
import { savePlace } from "@/lib/place-memory";
import { londonDate } from "@/lib/london";
import {
  type Choice,
  findSeva,
  type FinderNeed,
  type FinderShift,
  type Found,
  nearEnough,
  PARTS_OF_DAY,
  type PartOfDay,
  placesBy,
  ROLE_KINDS,
  type RoleKind,
} from "@/lib/seva-finder";

// The Seva page's finder: near me, what kind of seva, which day and time,
// as a list or a map, and a slot taken right here with no name asked
// (decision 0013). Everything is narrowed in the browser, so each choice
// answers at once; where the visitor is never leaves their phone.

type Translate = ReturnType<typeof useT<keyof typeof enSeva>>;

export type FinderDay = { day: string; label: string; heading: string };

export type FinderOrigin = Position & { place: string };

export const KIND_ICONS: Record<RoleKind, string> = {
  kitchen: "🍲",
  parking: "🚗",
  shoes: "👟",
  decorations: "🪔",
  prasad: "🍬",
  children: "🧸",
  cleaning: "🧹",
  welcome: "🙏",
  other: "✨",
};

const PART_ICONS: Record<PartOfDay, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
};

const RADII = [5, 15, 30, 60] as const;

// Cards shown before "Show more", when nothing narrows the list.
const FIRST = 10;

const SevaMap = dynamic(
  () => import("@/components/seva-map").then((m) => m.SevaMap),
  {
    ssr: false,
    loading: () => (
      <div className="border-line bg-sunk shadow-card h-[60vh] min-h-80 w-full animate-pulse rounded-2xl border" />
    ),
  },
);

const noSubscribe = () => () => {};

export function SevaExplorer({
  needs,
  days,
  today,
  tomorrow,
  origin: given,
  within: givenWithin,
  initial,
  postcode,
}: {
  needs: FinderNeed[];
  days: FinderDay[];
  today: string;
  tomorrow: string;
  // A postcode typed in the form (worked out on the server).
  origin: FinderOrigin | null;
  within: number;
  initial: Choice & { view: "list" | "map"; all: boolean };
  // The postcode form, for anyone whose phone won't say where they are.
  postcode: ReactNode;
}) {
  const t = useT(enSeva);
  const [choice, setChoice] = useState<Choice>({
    kind: initial.kind,
    day: initial.day,
    part: initial.part,
  });
  const [view, setView] = useState(initial.view);
  const [all, setAll] = useState(initial.all);
  const [origin, setOrigin] = useState<FinderOrigin | Position | null>(given);
  const [within, setWithin] = useState(givenWithin);
  const [celebrating, setCelebrating] = useState<{
    slot: MySlot;
    mandir: string;
  } | null>(null);

  // Keep the choices in the address, so the page can be shared as chosen
  // and comes back the same. A position from "Near me" is never put there.
  useEffect(() => {
    const params = new URLSearchParams();
    if (origin && "place" in origin) params.set("near", origin.place);
    if (origin && within !== 15) params.set("within", String(within));
    if (choice.kind) params.set("kind", choice.kind);
    if (choice.day) params.set("day", choice.day);
    if (choice.part) params.set("time", choice.part);
    if (view === "map") params.set("view", "map");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [choice, view, origin, within]);

  const near = useMemo(
    () => nearEnough(needs, origin, origin ? within : null),
    [needs, origin, within],
  );
  const found = useMemo(() => findSeva(near, choice), [near, choice]);
  const byKind = useMemo(
    () => placesBy(near, choice, "kind", (s) => s.kind),
    [near, choice],
  );
  const byDay = useMemo(
    () => placesBy(near, choice, "day", (s) => s.day),
    [near, choice],
  );
  const byPart = useMemo(
    () => placesBy(near, choice, "part", (s) => s.part),
    [near, choice],
  );
  const kinds = ROLE_KINDS.filter((k) =>
    needs.some((n) => n.shifts.some((s) => s.kind === k)),
  );
  const narrowed = Boolean(choice.kind || choice.day || choice.part || origin);
  const shown = all || narrowed ? found : found.slice(0, FIRST);
  const groups = groupByDay(shown);
  const headings = new Map(days.map((d) => [d.day, d.heading]));

  const choose = (change: Partial<Choice>) =>
    setChoice((c) => ({ ...c, ...change }));

  return (
    <>
      <MySeva />

      {/* From laptop size up: where, what and when on the left, the
          places that need help beside them. */}
      <div className="flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(20rem,27rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-6 sm:gap-8">
          <section
            aria-label={t("sevaFind.nearMe")}
            className="border-line bg-surface shadow-card flex flex-col gap-4 rounded-3xl border p-5 sm:p-6"
          >
            <NearMeButton
              t={t}
              origin={origin}
              within={within}
              onFound={setOrigin}
              onWithin={setWithin}
              onClear={() => {
                setOrigin(null);
                // "Anywhere": next time too.
                savePlace({ skip: true });
              }}
            />
            {postcode}
          </section>

          <section aria-labelledby="help-with" className="flex flex-col gap-3">
            <h2 id="help-with" className="text-xl font-bold sm:text-2xl">
              {t("sevaFind.helpWith")}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-2">
              <Tile
                pressed={!choice.kind}
                onClick={() => choose({ kind: "" })}
                icon="💛"
                label={t("sevaFind.anything")}
                count={places(t, sum(byKind))}
              />
              {kinds.map((k) => (
                <Tile
                  key={k}
                  pressed={choice.kind === k}
                  onClick={() => choose({ kind: choice.kind === k ? "" : k })}
                  icon={KIND_ICONS[k]}
                  label={t(`sevaKind.${k}`)}
                  count={places(t, byKind.get(k) ?? 0)}
                  quiet={!byKind.get(k)}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="when-free" className="flex flex-col gap-3">
            <h2 id="when-free" className="text-xl font-bold sm:text-2xl">
              {t("sevaFind.whenFree")}
            </h2>
            <div
              role="group"
              aria-labelledby="when-free"
              className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
            >
              <DayChip
                pressed={!choice.day}
                onClick={() => choose({ day: "" })}
                label={t("sevaFind.anyDay")}
                count={places(t, sum(byDay))}
              />
              {days.map((d) => (
                <DayChip
                  key={d.day}
                  pressed={choice.day === d.day}
                  onClick={() =>
                    choose({ day: choice.day === d.day ? "" : d.day })
                  }
                  label={d.label}
                  count={places(t, byDay.get(d.day) ?? 0)}
                  quiet={!byDay.get(d.day)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip pressed={!choice.part} onClick={() => choose({ part: "" })}>
                {t("sevaFind.anyTime")}
              </Chip>
              {PARTS_OF_DAY.map((p) => (
                <Chip
                  key={p}
                  pressed={choice.part === p}
                  onClick={() => choose({ part: choice.part === p ? "" : p })}
                  quiet={!byPart.get(p)}
                >
                  <span aria-hidden="true">{PART_ICONS[p]}</span>{" "}
                  {t(`sevaFind.${p}`)}
                </Chip>
              ))}
            </div>
          </section>
        </div>

        <section
          aria-labelledby="needed"
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="needed"
              className="scroll-mt-24 text-xl font-bold sm:text-2xl"
              aria-live="polite"
            >
              {t(
                found.length === 1
                  ? "sevaFind.found.one"
                  : "sevaFind.found.other",
                { count: found.length },
              )}
            </h2>
            <div
              role="group"
              aria-label={t("sevaFind.showAs")}
              className="bg-sunk flex rounded-full p-1"
            >
              {(["list", "map"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-base font-semibold transition ${
                    view === v
                      ? "bg-surface text-ink shadow-card"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {t(`sevaFind.${v}`)}
                </button>
              ))}
            </div>
          </div>

          {!found.length ? (
            <div className="bg-sunk flex flex-col items-start gap-3 rounded-3xl p-6">
              <p className="font-semibold">{t("sevaFind.none")}</p>
              <button
                type="button"
                onClick={() => {
                  setChoice({ kind: "", day: "", part: "" });
                  setOrigin(null);
                }}
                className={quietButtonClass}
              >
                {t("sevaFind.showAll")}
              </button>
            </div>
          ) : view === "map" ? (
            <SevaMap found={found} origin={origin} />
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map(({ day, items }) => (
                <section key={day} className="flex flex-col gap-3">
                  <h3 className="text-marigold-ink text-base font-semibold tracking-[0.12em] uppercase">
                    {headings.get(day) ?? day}
                  </h3>
                  <ul className="flex flex-col gap-4">
                    {items.map((item) => (
                      <li key={item.need.id}>
                        <NeedCard
                          item={item}
                          today={today}
                          tomorrow={tomorrow}
                          onTaken={(slot) =>
                            setCelebrating({ slot, mandir: item.need.mandir })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {shown.length < found.length && (
                <a
                  href="?all=1#needed"
                  onClick={(event) => {
                    event.preventDefault();
                    setAll(true);
                  }}
                  className={`${quietButtonClass} self-center`}
                >
                  {t("sevaFind.showMore", {
                    count: found.length - shown.length,
                  })}
                </a>
              )}
            </div>
          )}
        </section>
      </div>

      {celebrating && (
        <Celebration
          slot={celebrating.slot}
          mandir={celebrating.mandir}
          onClose={() => setCelebrating(null)}
        />
      )}
    </>
  );
}

function sum(counts: Map<string, number>): number {
  return [...counts.values()].reduce((a, b) => a + b, 0);
}

function places(t: Translate, count: number): string {
  return t(count === 1 ? "sevaFind.places.one" : "sevaFind.places.other", {
    count,
  });
}

function groupByDay(found: Found[]): { day: string; items: Found[] }[] {
  const groups: { day: string; items: Found[] }[] = [];
  for (const item of found) {
    const day = item.shifts[0].day;
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

function formatAway(t: Translate, miles: number): string {
  return t("sevaFind.away", {
    miles: miles < 10 ? miles.toFixed(1) : Math.round(miles),
  });
}

// "Find seva near me": the browser's position, used here only.
function NearMeButton({
  t,
  origin,
  within,
  onFound,
  onWithin,
  onClear,
}: {
  t: Translate;
  origin: FinderOrigin | Position | null;
  within: number;
  onFound: (at: Position) => void;
  onWithin: (miles: number) => void;
  onClear: () => void;
}) {
  const supported = useSyncExternalStore(
    noSubscribe,
    () => "geolocation" in navigator,
    () => true,
  );
  const [state, setState] = useState<"idle" | "finding" | "denied" | "failed">(
    "idle",
  );

  function findMe() {
    setState("finding");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setState("idle");
        onFound({ latitude: coords.latitude, longitude: coords.longitude });
      },
      (error) =>
        setState(error.code === error.PERMISSION_DENIED ? "denied" : "failed"),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  if (origin) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg font-bold">
          <span aria-hidden="true">📍 </span>
          {"place" in origin
            ? t("sevaFind.nearPlace", { place: origin.place })
            : t("sevaFind.nearYou")}
        </p>
        <div
          role="group"
          aria-label={t("sevaFind.howFar")}
          className="flex flex-wrap gap-2"
        >
          {RADII.map((r) => (
            <Chip key={r} pressed={within === r} onClick={() => onWithin(r)}>
              {t("sevaFind.miles", { miles: r })}
            </Chip>
          ))}
          <Chip pressed={false} onClick={onClear}>
            {t("sevaFind.anywhere")}
          </Chip>
        </div>
      </div>
    );
  }
  if (!supported) return null;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={findMe}
        disabled={state === "finding"}
        className={`${buttonClass} inline-flex items-center justify-center gap-2 text-xl`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`size-6 ${state === "finding" ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {state === "finding" ? t("sevaFind.finding") : t("sevaFind.nearMe")}
      </button>
      <p className="text-muted text-center text-base" aria-live="polite">
        {state === "denied"
          ? t("sevaFind.denied")
          : state === "failed"
            ? t("sevaFind.failed")
            : t("sevaFind.private")}
      </p>
    </div>
  );
}

const pressedRing =
  "aria-pressed:border-peacock aria-pressed:bg-peacock/10 aria-pressed:ring-peacock aria-pressed:ring-2";

// An option with nothing in it just now: still there to press, but plainer.
// (Fading it with opacity would make its words too faint to read.)
const QUIET = "bg-sunk border-dashed";

function Tile({
  pressed,
  onClick,
  icon,
  label,
  count,
  quiet = false,
}: {
  pressed: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: string;
  quiet?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`border-line hover:border-peacock/60 flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.97] sm:p-4 ${pressedRing} ${quiet && !pressed ? QUIET : "bg-surface"}`}
    >
      <span aria-hidden="true" className="text-3xl leading-none sm:text-4xl">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="leading-snug font-bold">{label}</span>
        <span className="text-muted text-base leading-snug">{count}</span>
      </span>
    </button>
  );
}

function DayChip({
  pressed,
  onClick,
  label,
  count,
  quiet = false,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  count: string;
  quiet?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`border-line hover:border-peacock/60 flex shrink-0 cursor-pointer snap-start flex-col items-start rounded-2xl border px-4 py-2 text-left transition active:scale-[0.97] ${pressedRing} ${quiet && !pressed ? QUIET : "bg-surface"}`}
    >
      <span className="font-bold whitespace-nowrap">{label}</span>
      <span className="text-muted text-base whitespace-nowrap">{count}</span>
    </button>
  );
}

function Chip({
  pressed,
  onClick,
  quiet = false,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  quiet?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`border-line hover:border-peacock/60 cursor-pointer rounded-full border px-4 py-1.5 text-base font-semibold transition active:scale-95 ${pressedRing} ${quiet && !pressed ? QUIET : "bg-surface"}`}
    >
      {children}
    </button>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "kumkum" | "marigold" | "leaf" | "quiet";
  children: ReactNode;
}) {
  const colours = {
    kumkum: "bg-kumkum/10 text-kumkum",
    marigold: "bg-marigold/15 text-marigold-ink",
    leaf: "bg-leaf-tint text-leaf-ink",
    quiet: "bg-sunk text-muted",
  }[tone];
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-base font-semibold ${colours}`}
    >
      {children}
    </span>
  );
}

// How full: the bar fills as it comes into view.
function Filled({ done, needed }: { done: number; needed: number }) {
  return (
    <span
      className="bg-sunk block h-2.5 overflow-hidden rounded-full"
      aria-hidden="true"
    >
      <span
        className="fill-bar bg-marigold block h-full rounded-full"
        style={{ width: `${Math.max(4, (done / needed) * 100)}%` }}
      />
    </span>
  );
}

function NeedCard({
  item: { need, shifts, miles },
  today,
  tomorrow,
  onTaken,
}: {
  item: Found;
  today: string;
  tomorrow: string;
  onTaken: (slot: MySlot) => void;
}) {
  const t = useT(enSeva);
  const [open, setOpen] = useState(false);
  const needed = shifts.reduce((n, s) => n + s.needed, 0);
  const free = shifts.reduce((n, s) => n + s.free, 0);
  const first = shifts[0];
  const roles = [...new Map(shifts.map((s) => [s.role, s])).values()].map(
    (r) => ({
      ...r,
      free: shifts
        .filter((s) => s.role === r.role)
        .reduce((n, s) => n + s.free, 0),
    }),
  );
  const manyDays = new Set(shifts.map((s) => s.day)).size > 1;
  const listId = `shifts-${need.id}`;

  return (
    <article className="border-line bg-surface shadow-card flex flex-col gap-4 rounded-3xl border p-4 sm:p-5">
      <div className="flex gap-4">
        <DateTileView parts={need.tile} label={need.dateLabel} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex flex-wrap gap-1.5">
            {first.day === today && (
              <Pill tone="kumkum">{t("sevaFind.neededToday")}</Pill>
            )}
            {first.day === tomorrow && (
              <Pill tone="marigold">{t("sevaFind.neededTomorrow")}</Pill>
            )}
            {free <= 3 && (
              <Pill tone="kumkum">
                {t(
                  free === 1
                    ? "sevaFind.onlyLeft.one"
                    : "sevaFind.onlyLeft.other",
                  { count: free },
                )}
              </Pill>
            )}
          </p>
          <h4 className="text-lg leading-snug font-semibold sm:text-xl">
            <Link href={need.path} className="hover:text-peacock no-underline">
              {need.title}
            </Link>
          </h4>
          {need.titleGu && (
            <p lang="gu" className="font-semibold">
              {need.titleGu}
            </p>
          )}
          <p className="text-muted">
            {need.mandir} · {need.town}
            {miles !== null && ` · ${formatAway(t, miles)}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Filled done={needed - free} needed={needed} />
        <p className="flex flex-wrap justify-between gap-x-3 text-base">
          <span className="text-muted">
            {t("sevaFind.filled", { done: needed - free, needed })}
          </span>
          <span className="text-leaf-ink font-semibold">
            {t("sevaFind.stillNeeded", { count: free })}
          </span>
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <li key={r.role}>
            <Pill tone={r.needsDbs ? "quiet" : "leaf"}>
              <span aria-hidden="true">{KIND_ICONS[r.kind]} </span>
              {r.role} {r.free}
            </Pill>
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className="border-peacock/40 text-peacock hover:bg-peacock/5 flex cursor-pointer items-center justify-between gap-2 rounded-full border px-5 py-2.5 font-semibold transition active:scale-[0.98]"
      >
        {open
          ? t("sevaFind.hideShifts")
          : t(
              shifts.length === 1
                ? "sevaFind.chooseShift.one"
                : "sevaFind.chooseShift.other",
              { count: shifts.length },
            )}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`size-5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div id={listId} hidden={!open} className="flex flex-col gap-3">
        {open && (
          <ul className="rise-list flex flex-col gap-3">
            {shifts.map((s) => (
              <ShiftRow
                key={s.id}
                need={need}
                shift={s}
                when={manyDays ? s.label : s.time}
                onTaken={onTaken}
              />
            ))}
          </ul>
        )}
        <Link
          href={need.path}
          className="text-peacock self-start font-semibold"
        >
          {t("sevaFind.wholeRota")} →
        </Link>
      </div>
    </article>
  );
}

function ShiftRow({
  need,
  shift,
  when,
  onTaken,
}: {
  need: FinderNeed;
  shift: FinderShift;
  when: string;
  onTaken: (slot: MySlot) => void;
}) {
  const t = useT(enSeva);
  const done = shift.needed - shift.free;
  return (
    <li className="border-line flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <p className="font-semibold">
          <span aria-hidden="true">{KIND_ICONS[shift.kind]} </span>
          {shift.role} <span className="text-muted font-normal">· {when}</span>
        </p>
        <Filled done={done} needed={shift.needed} />
        <p className="text-muted text-base">
          {t("sevaFind.filled", { done, needed: shift.needed })}
          {shift.free <= 2 && (
            <span className="text-kumkum font-semibold">
              {" · "}
              {t(
                shift.free === 1
                  ? "sevaFind.onlyLeft.one"
                  : "sevaFind.onlyLeft.other",
                { count: shift.free },
              )}
            </span>
          )}
        </p>
      </div>
      {shift.needsDbs ? (
        <p className="text-muted text-base">{t("sevaFind.askCommittee")}</p>
      ) : (
        <TakeButton need={need} shift={shift} onTaken={onTaken} />
      )}
    </li>
  );
}

const ERRORS = {
  full: "slot.full",
  closed: "slot.closed",
  failed: "slot.failed",
} as const;

function TakeButton({
  need,
  shift,
  onTaken,
}: {
  need: FinderNeed;
  shift: FinderShift;
  onTaken: (slot: MySlot) => void;
}) {
  const t = useT(enSlots);
  const mine = useMySlots().some((s) => s.shift === shift.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<keyof typeof ERRORS | null>(null);

  if (mine) {
    return (
      <p className="text-peacock font-semibold" role="status">
        {t("slot.youreOn")}
      </p>
    );
  }

  async function take() {
    setPending(true);
    setError(null);
    const details = {
      shift: shift.id,
      event: need.id,
      role: shift.role,
      label: shift.label,
      starts_at: shift.startsAt,
      ends_at: shift.endsAt,
      title: need.title,
      place: need.place,
      path: need.path,
    };
    const result = await takeAndKeep(need.slug, details);
    setPending(false);
    if (result?.ok) onTaken({ ...details, slot: result.slot });
    else setError(result?.error ?? "failed");
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={take}
        disabled={pending}
        aria-label={t("slot.takeLabel", {
          role: shift.role,
          label: shift.label,
        })}
        className={`${buttonClass} w-auto px-5 py-2 text-base`}
      >
        {pending ? t("slot.taking") : t("slot.take")}
      </button>
      {error && (
        <p className="text-kumkum text-base" role="alert">
          {t(ERRORS[error])}
        </p>
      )}
    </div>
  );
}

// Petals for the celebration: where each starts, how long it falls, how
// it turns, and its colour.
const PETALS = Array.from({ length: 18 }, (_, i) => ({
  x: `${(i * 37) % 100}%`,
  d: `${1.6 + ((i * 7) % 10) / 10}s`,
  delay: `${((i * 3) % 8) / 10}s`,
  r: `${((i * 53) % 360) - 180}deg`,
  colour: ["var(--marigold)", "#f26b1d", "var(--kumkum)", "var(--leaf)"][i % 4],
}));

// "Thank you!": marigolds fall and a diya glows (still, for anyone who
// asked their device for less motion), then add it to a calendar or ask
// friends to come too.
function Celebration({
  slot,
  mandir,
  onClose,
}: {
  slot: MySlot;
  mandir: string;
  onClose: () => void;
}) {
  const t = useT(enSeva);
  const ts = useT(enSlots);
  const origin = useOrigin();
  const box = useRef<HTMLDialogElement>(null);
  const entry = calendarEntry(slot, origin);
  const share = t("sevaFind.shareText", {
    role: slot.role,
    title: slot.title,
    mandir,
    url: `${origin}${slot.path}`,
  });

  useEffect(() => {
    const dialog = box.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={box}
      onClose={onClose}
      aria-labelledby="thanks"
      className="bg-surface text-ink m-auto w-[min(28rem,calc(100%-2rem))] overflow-hidden rounded-3xl p-0 backdrop:bg-black/60"
    >
      <div className="relative flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center">
        <div aria-hidden="true" className="petals">
          {PETALS.map((p, i) => (
            <span
              key={i}
              style={
                {
                  left: p.x,
                  background: p.colour,
                  "--d": p.d,
                  "--delay": p.delay,
                  "--r": p.r,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <p aria-hidden="true" className="diya text-7xl leading-none">
          🪔
        </p>
        <h2 id="thanks" className="font-display text-4xl leading-tight">
          {t("sevaFind.thanks")}
        </h2>
        <p className="text-xl font-bold">
          {t("sevaFind.youreOn", { role: slot.role })}
        </p>
        <p>{t("sevaFind.when", { label: slot.label, place: mandir })}</p>
        <p className="text-muted text-base">{t("sevaFind.onlyPhone")}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(share)}`}
            className={`${buttonClass} text-center no-underline`}
          >
            {t("sevaFind.askFriends")}
          </a>
          <a
            href={googleCalendarLink(entry)}
            target="_blank"
            rel="noopener"
            className={`${quietButtonClass} justify-center`}
          >
            {ts("slot.google")}
          </a>
          <button
            type="button"
            onClick={() => downloadCalendar(entry)}
            className={`${quietButtonClass} justify-center`}
          >
            {ts("slot.apple")}
          </button>
          <button
            type="button"
            onClick={() => box.current?.close()}
            className="text-peacock mt-1 cursor-pointer py-2 font-semibold underline"
          >
            {t("sevaFind.backToSeva")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// The minute now, for countdowns; it changes once a minute.
function subscribeMinute(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
}
const thisMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

// "Your seva": every slot this phone has taken that's still to come, at
// the top of the page, with how soon.
function MySeva() {
  const t = useT(enSeva);
  const ts = useT(enSlots);
  const now = useSyncExternalStore(subscribeMinute, thisMinute, () => 0);
  const slots = useMySlots()
    .filter((s) => now && Date.parse(s.ends_at) > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  if (!slots.length) return null;

  const today = londonDate(new Date(now));
  function soon(slot: MySlot): string {
    if (Date.parse(slot.starts_at) <= now) return t("sevaFind.onNow");
    const day = londonDate(new Date(slot.starts_at));
    const days = Math.round(
      (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
        86_400_000,
    );
    if (days <= 0) return t("sevaFind.today");
    if (days === 1) return t("sevaFind.tomorrow");
    return t("sevaFind.inDays", { count: days });
  }

  return (
    <section
      aria-labelledby="my-seva"
      className="border-peacock/30 bg-peacock/5 rise flex flex-col gap-3 rounded-3xl border p-5"
    >
      <h2 id="my-seva" className="font-display text-3xl leading-tight">
        {t("sevaFind.mine")}
      </h2>
      <ul className="flex flex-col gap-4">
        {slots.map((s) => (
          <MySlotItem key={s.slot} slug={slotMandir(s)} slot={s}>
            <p className="flex flex-wrap items-center gap-2">
              <Pill tone="marigold">{soon(s)}</Pill>
              <Link href={s.path} className="text-peacock font-semibold">
                {s.title}
              </Link>
            </p>
          </MySlotItem>
        ))}
      </ul>
      <p className="text-muted text-base">{ts("slot.onlyYourPhone")}</p>
    </section>
  );
}
