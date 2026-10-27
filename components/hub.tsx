"use client";

import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Star, useFollowing } from "@/components/follow";
import { CalendarIcon, ClockIcon, WhatsAppIcon } from "@/components/icons";
import { OpenNow } from "@/components/open-now";
import { usePlan } from "@/components/plan";
import {
  addSlots,
  type MySlot,
  MySlotItem,
  slotMandir,
  useMySlots,
} from "@/components/seva-slots";
import {
  actionPillClass,
  cardClass,
  Notice,
  pillButtonClass,
  quietButtonClass,
} from "@/components/ui";
import { useOrigin } from "@/components/use-origin";
import { useLocale, useT } from "@/components/use-t";
import {
  clearVisits,
  forgetVisit,
  mergeVisits,
  notePlanned,
  onVisitsChange,
  parseVisits,
  pastVisits,
  setWent,
  visitsSnapshot,
} from "@/lib/event-history";
import { clearFollowing, mergeFollowing, setFollowing } from "@/lib/follow";
import { loadHub, type HubDetails } from "@/lib/hub-actions";
import {
  comingUp,
  decodeMove,
  encodeMove,
  hubPath,
  type MoveData,
  yearTotals,
} from "@/lib/hub";
import { enHub } from "@/lib/i18n/client/hub";
import { londonDate } from "@/lib/london";
import { readSaved, savePlace } from "@/lib/place-memory";
import { clearPlan, mergePlan, planHref } from "@/lib/plan";
import {
  clearDone,
  doneSnapshot,
  forgetDone,
  keepEnded,
  onDoneChange,
  parseDone,
  shiftHours,
} from "@/lib/seva-history";
import { whatsAppLink } from "@/lib/whatsapp";

// My Toran: everything this phone keeps, in one place, with big tiles at
// the top to jump to each part. Nothing here is stored by Toran: the
// mandirs, plan, past events and seva come from the phone's storage, and
// only their ids are sent to look up names (lib/hub-actions.ts).

type T = (
  key: keyof typeof enHub,
  values?: Record<string, string | number>,
) => string;

// The minute, ticking; null while the page is being built, when there's
// no phone storage to read yet.
function subscribeMinute(update: () => void) {
  const timer = setInterval(update, 30_000);
  return () => clearInterval(timer);
}
const thisMinute = () => Math.floor(Date.now() / 60_000);
const notYet = () => null;

function useVisits() {
  const snapshot = useSyncExternalStore(
    onVisitsChange,
    visitsSnapshot,
    () => "",
  );
  return useMemo(() => parseVisits(snapshot), [snapshot]);
}

function useDone() {
  const snapshot = useSyncExternalStore(onDoneChange, doneSnapshot, () => "");
  return useMemo(() => parseDone(snapshot), [snapshot]);
}

// The names and dates for what's saved, asked for whenever what's saved
// changes. Kept while a new answer is on its way.
function useDetails(
  locale: string,
  slugs: string[],
  events: { id: string; at: string }[],
): HubDetails | null {
  const key = JSON.stringify([locale, slugs, events]);
  const [answer, setAnswer] = useState<{
    key: string;
    details: HubDetails;
  } | null>(null);
  useEffect(() => {
    const [lang, mandirs, asked] = JSON.parse(key) as [
      string,
      string[],
      { id: string; at: string }[],
    ];
    if (!mandirs.length && !asked.length) return;
    let current = true;
    loadHub(lang, mandirs, asked)
      .then((details) => {
        if (current) setAnswer({ key, details });
      })
      .catch(() => {
        if (current) setAnswer({ key, details: { state: "unavailable" } });
      });
    return () => {
      current = false;
    };
  }, [key]);
  return answer?.details ?? null;
}

// "Today" or "Tomorrow" for a time, in UK days.
function soon(at: string, now: Date, t: T): string | null {
  const day = londonDate(new Date(at));
  const today = londonDate(now);
  if (day === today) return t("hub.today");
  const tomorrow = londonDate(new Date(now.getTime() + 86_400_000));
  return day === tomorrow ? t("hub.tomorrow") : null;
}

// A date when the names couldn't be loaded.
function plainDate(at: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "gu" ? "gu-IN" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(new Date(at));
}

export function Hub() {
  const t = useT(enHub) as T;
  const locale = useLocale();
  const minute = useSyncExternalStore(subscribeMinute, thisMinute, notYet);
  const following = useFollowing();
  const plan = usePlan();
  const slots = useMySlots();
  const visits = useVisits();
  const done = useDone();

  // Older plans and seva from before My Toran, brought in once.
  useEffect(() => {
    if (plan.length) notePlanned(plan);
  }, [plan]);
  useEffect(() => {
    if (slots.length) keepEnded(slots);
  }, [slots]);

  const asked = useMemo(
    () => [
      ...plan.map(({ id, at }) => ({ id, at })),
      ...visits.map(({ id, at }) => ({ id, at })),
    ],
    [plan, visits],
  );
  const details = useDetails(locale, following, asked);

  if (minute === null) {
    return <p className="text-muted">{t("hub.loading")}</p>;
  }
  const now = new Date(minute * 60_000);
  const upcoming = comingUp(plan, slots as MySlot[], now);
  const past = pastVisits(visits, now);
  const loaded = details?.state === "ok" ? details : null;
  const waiting =
    details === null && (following.length > 0 || asked.length > 0);
  const year = londonDate(now).slice(0, 4);
  const totals = yearTotals({
    year,
    went: past.went,
    done,
    mandirOf: (id) => loaded?.events[id]?.slug,
  });
  const comingSeva = slots.filter((s) => Date.parse(s.ends_at) > now.getTime());

  function eventTitle(id: string) {
    return loaded?.events[id]?.title ?? t("hub.event");
  }
  function when(id: string, at: string) {
    return loaded?.when[`${id}@${at}`] ?? plainDate(at, locale);
  }

  const tiles: {
    href: string;
    label: string;
    detail: string;
    icon: ReactNode;
  }[] = [
    {
      href: "#coming",
      label: t("hub.tile.coming"),
      detail: upcoming.length
        ? t("hub.tile.count", { count: upcoming.length })
        : t("hub.tile.nothing"),
      icon: <CalendarIcon />,
    },
    {
      href: "#mandirs",
      label: t("hub.tile.mandirs"),
      detail: following.length
        ? t("hub.tile.count", { count: following.length })
        : t("hub.tile.nothing"),
      icon: <Star filled />,
    },
    {
      href: "#seva",
      label: t("hub.tile.seva"),
      detail:
        comingSeva.length || done.length
          ? t("hub.tile.count", { count: comingSeva.length + done.length })
          : t("hub.tile.nothing"),
      icon: <HandsIcon />,
    },
    {
      href: "#past",
      label: t("hub.tile.past"),
      detail: past.ask.length
        ? t("hub.tile.ask", { count: past.ask.length })
        : past.went.length
          ? t("hub.tile.count", { count: past.went.length })
          : t("hub.tile.nothing"),
      icon: <ClockIcon />,
    },
    {
      href: planHref(
        locale,
        plan.map((p) => p.id),
      ),
      label: t("hub.tile.plan"),
      detail: plan.length
        ? t("hub.tile.count", { count: plan.length })
        : t("hub.tile.nothing"),
      icon: <ListIcon />,
    },
    {
      href: "#settings",
      label: t("hub.tile.settings"),
      detail: "",
      icon: <GearIcon />,
    },
  ];

  return (
    <div id="top" className="flex flex-col gap-10 sm:gap-12">
      <MoveIn t={t} />
      <p className="text-muted -mt-4 text-lg sm:-mt-6">{t("hub.onlyHere")}</p>

      <nav aria-label={t("hub.parts")}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <li key={tile.href}>
              <a
                href={tile.href}
                className={`${cardClass} hover:border-peacock/60 flex h-full min-h-28 flex-col justify-between gap-2 p-4 no-underline transition active:scale-[0.98] sm:p-5`}
              >
                <span className="text-peacock [&_svg]:size-7">{tile.icon}</span>
                <span className="flex flex-col">
                  <span className="text-ink text-xl font-semibold">
                    {tile.label}
                  </span>
                  {tile.detail && (
                    <span className="text-muted text-base">{tile.detail}</span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {(totals.events > 0 || totals.shifts > 0) && (
        <section aria-labelledby="year" className="flex flex-col gap-3">
          <h2
            id="year"
            className="text-marigold-ink text-base font-semibold tracking-[0.12em] uppercase"
          >
            {t("hub.year")}
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [totals.events, t("hub.stat.events")],
              [totals.shifts, t("hub.stat.shifts")],
              [totals.hours, t("hub.stat.hours")],
              [totals.mandirs, t("hub.stat.mandirs")],
            ].map(([value, label]) => (
              <div
                key={label}
                className="bg-sunk flex flex-col rounded-2xl px-4 py-3"
              >
                <dt className="text-muted order-2 text-base">{label}</dt>
                <dd className="font-display order-1 text-4xl">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {waiting && (
        <p className="text-muted" role="status">
          {t("hub.loading")}
        </p>
      )}
      {details && details.state !== "ok" && <Notice>{t("hub.offline")}</Notice>}

      <Section id="coming" title={t("hub.tile.coming")} t={t}>
        {upcoming.length ? (
          <ul className="divide-line flex flex-col divide-y">
            {upcoming.map((item) => {
              const badge = soon(item.at, now, t);
              if (item.kind === "seva") {
                const s = item.slot;
                return (
                  <li
                    key={`seva-${s.slot}`}
                    className="flex flex-col gap-1 py-3"
                  >
                    <p className="flex flex-wrap items-center gap-2">
                      {badge && <Pill>{badge}</Pill>}
                      <span className="text-marigold-ink font-semibold">
                        {s.label}
                      </span>
                    </p>
                    <Link
                      href={s.path}
                      className="text-ink text-lg font-semibold"
                    >
                      {t("hub.coming.seva", { role: s.role })}: {s.title}
                    </Link>
                    <p className="text-muted">{s.place}</p>
                  </li>
                );
              }
              const e = loaded?.events[item.id];
              return (
                <li
                  key={`event-${item.id}`}
                  className="flex flex-col gap-1 py-3"
                >
                  <p className="flex flex-wrap items-center gap-2">
                    {badge && <Pill>{badge}</Pill>}
                    <span className="text-marigold-ink font-semibold">
                      {when(item.id, item.at)}
                    </span>
                    {e?.cancelled && (
                      <Pill tone="kumkum">{t("hub.cancelled")}</Pill>
                    )}
                  </p>
                  {e ? (
                    <Link
                      href={e.path}
                      className="text-ink text-lg font-semibold"
                    >
                      {e.title}
                    </Link>
                  ) : (
                    <p className="text-lg font-semibold">{t("hub.event")}</p>
                  )}
                  <p className="text-muted">
                    {e ? `${e.mandir}, ${e.town} · ` : ""}
                    {t("hub.coming.plan")}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty
            text={t("hub.coming.empty")}
            links={[
              [
                locale === "gu" ? "/gu/whats-on" : "/whats-on",
                t("hub.findEvents"),
              ],
              [locale === "gu" ? "/gu/seva" : "/seva", t("hub.findSeva")],
            ]}
          />
        )}
      </Section>

      <Section id="mandirs" title={t("hub.tile.mandirs")} t={t}>
        {following.length ? (
          <>
            <ul className="grid gap-3 sm:grid-cols-2">
              {following.map((slug) => {
                const m = loaded?.mandirs[slug];
                const name = m?.name ?? slug.replace(/-/g, " ");
                return (
                  <li
                    key={slug}
                    className={`${cardClass} flex flex-col gap-3 p-5`}
                  >
                    <div className="flex flex-col gap-1">
                      <Link
                        href={
                          m?.path ??
                          `${locale === "gu" ? "/gu" : ""}/mandirs/${slug}`
                        }
                        className="text-ink text-xl font-semibold"
                      >
                        {name}
                      </Link>
                      {m && <p className="text-muted">{m.town}</p>}
                    </div>
                    {m?.hours && <OpenNow {...m.hours} />}
                    {m &&
                      (m.next ? (
                        <p>
                          <span className="text-muted block text-base">
                            {t("hub.mandirs.next")}
                          </span>
                          <span className="text-marigold-ink block font-semibold">
                            {m.next.when}
                          </span>
                          <Link
                            href={m.next.path}
                            className="text-peacock underline"
                          >
                            {m.next.title}
                          </Link>
                        </p>
                      ) : (
                        <p className="text-muted">{t("hub.mandirs.nothing")}</p>
                      ))}
                    <p className="mt-auto flex flex-wrap gap-2">
                      <Link
                        href={`${locale === "gu" ? "/gu" : ""}/whats-on?mandirs=${slug}`}
                        className={pillButtonClass}
                      >
                        {t("hub.mandirs.events")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setFollowing(slug, false)}
                        aria-label={t("hub.mandirs.unfollowLabel", { name })}
                        className={pillButtonClass}
                      >
                        {t("hub.mandirs.unfollow")}
                      </button>
                    </p>
                  </li>
                );
              })}
            </ul>
            <Link
              href={`${locale === "gu" ? "/gu" : ""}/whats-on?mandirs=${following.join(",")}`}
              className={`${actionPillClass} self-start`}
            >
              <Star filled />
              {t("hub.mandirs.events")}
            </Link>
          </>
        ) : (
          <Empty
            text={t("hub.mandirs.empty")}
            links={[
              [
                locale === "gu" ? "/gu/mandirs" : "/mandirs",
                t("hub.findMandirs"),
              ],
            ]}
          />
        )}
      </Section>

      <Section id="seva" title={t("hub.tile.seva")} t={t}>
        {comingSeva.length > 0 && (
          <div className="border-peacock/30 bg-peacock/5 flex flex-col gap-3 rounded-2xl border p-5">
            <h3 className="font-display text-2xl">{t("hub.seva.coming")}</h3>
            <ul className="flex flex-col gap-4">
              {[...comingSeva]
                .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                .map((s) => (
                  <MySlotItem key={s.slot} slug={slotMandir(s)} slot={s}>
                    <p>
                      <Link
                        href={s.path}
                        className="text-peacock font-semibold"
                      >
                        {s.title}
                      </Link>
                      <span className="text-muted">, {s.place}</span>
                    </p>
                  </MySlotItem>
                ))}
            </ul>
          </div>
        )}
        {done.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-2xl">{t("hub.seva.done")}</h3>
            <ul className="divide-line flex flex-col divide-y">
              {done.map((s) => {
                const hours = shiftHours(s);
                return (
                  <li key={s.slot} className="flex flex-col gap-1 py-3">
                    <p className="text-marigold-ink font-semibold">{s.label}</p>
                    <p className="text-lg font-semibold">
                      {s.role} ·{" "}
                      <Link href={s.path} className="text-ink">
                        {s.title}
                      </Link>
                    </p>
                    <p className="text-muted flex flex-wrap items-center gap-x-3">
                      <span>{s.place}</span>
                      {hours > 0 && (
                        <span>
                          {hours === 1
                            ? t("hub.seva.hour")
                            : t("hub.seva.hours", { count: hours })}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => forgetDone(s.slot)}
                        aria-label={t("hub.seva.notDoneLabel", {
                          role: s.role,
                          title: s.title,
                        })}
                        className="text-muted cursor-pointer text-base underline"
                      >
                        {t("hub.seva.notDone")}
                      </button>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {!comingSeva.length && !done.length && (
          <Empty
            text={t("hub.seva.empty")}
            links={[
              [locale === "gu" ? "/gu/seva" : "/seva", t("hub.findSeva")],
            ]}
          />
        )}
      </Section>

      <Section id="past" title={t("hub.tile.past")} t={t}>
        {past.ask.length > 0 && (
          <div className="border-marigold/40 bg-marigold/10 flex flex-col gap-3 rounded-2xl border p-5">
            <h3 className="font-display text-2xl">{t("hub.past.ask")}</h3>
            <ul className="flex flex-col gap-4">
              {past.ask.slice(0, 5).map((v) => {
                const title = eventTitle(v.id);
                const e = loaded?.events[v.id];
                return (
                  <li key={v.id} className="flex flex-col gap-2">
                    <p>
                      <span className="text-marigold-ink block font-semibold">
                        {when(v.id, v.at)}
                      </span>
                      <span className="text-lg font-semibold">{title}</span>
                      {e && <span className="text-muted">, {e.mandir}</span>}
                    </p>
                    <p className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setWent(v.id, v.at, true)}
                        aria-label={t("hub.past.yesLabel", { title })}
                        className={`${quietButtonClass} border-peacock px-5 py-2`}
                      >
                        {t("hub.past.yes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setWent(v.id, v.at, false)}
                        aria-label={t("hub.past.noLabel", { title })}
                        className={`${quietButtonClass} px-5 py-2`}
                      >
                        {t("hub.past.no")}
                      </button>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {past.went.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-2xl">{t("hub.past.went")}</h3>
            <ul className="divide-line flex flex-col divide-y">
              {past.went.map((v) => {
                const e = loaded?.events[v.id];
                const title = eventTitle(v.id);
                return (
                  <li key={v.id} className="flex flex-col gap-1 py-3">
                    <p className="text-marigold-ink font-semibold">
                      {when(v.id, v.at)}
                    </p>
                    {e ? (
                      <Link
                        href={e.path}
                        className="text-ink text-lg font-semibold"
                      >
                        {e.title}
                      </Link>
                    ) : (
                      <p className="text-lg font-semibold">{title}</p>
                    )}
                    <p className="text-muted flex flex-wrap items-center gap-x-3">
                      {e && <span>{`${e.mandir}, ${e.town}`}</span>}
                      <button
                        type="button"
                        onClick={() => forgetVisit(v.id)}
                        aria-label={t("hub.past.removeLabel", { title })}
                        className="text-muted cursor-pointer text-base underline"
                      >
                        {t("hub.past.remove")}
                      </button>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          !past.ask.length && <Empty text={t("hub.past.empty")} links={[]} />
        )}
      </Section>

      <Section id="settings" title={t("hub.tile.settings")} t={t}>
        <Settings
          t={t}
          data={{
            following,
            plan,
            visits: visits.slice(0, 100),
            done: done.slice(0, 100),
            // Finished shifts travel in the record of seva done.
            slots: comingSeva as MySlot[],
          }}
        />
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  t,
  children,
}: {
  id: string;
  title: string;
  t: T;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-28 flex-col gap-4"
    >
      <h2
        id={`${id}-title`}
        className="font-display text-4xl leading-tight tracking-tight sm:text-5xl"
      >
        {title}
      </h2>
      {children}
      <a
        href="#top"
        className="text-peacock self-start text-base font-semibold"
      >
        {t("hub.backToTop")}
      </a>
    </section>
  );
}

function Empty({ text, links }: { text: string; links: [string, string][] }) {
  return (
    <div className="bg-sunk flex flex-col gap-3 rounded-3xl p-5 sm:p-6">
      <p>{text}</p>
      {links.length > 0 && (
        <p className="flex flex-wrap gap-2">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={actionPillClass}>
              {label} →
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}

function Pill({
  tone = "marigold",
  children,
}: {
  tone?: "marigold" | "kumkum";
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-base font-semibold ${
        tone === "kumkum"
          ? "bg-kumkum/10 text-kumkum"
          : "bg-marigold/15 text-marigold-ink"
      }`}
    >
      {children}
    </span>
  );
}

// Text size, the place for events nearby, moving to a new phone, and
// clearing everything.
function Settings({ t, data }: { t: T; data: MoveData }) {
  const locale = useLocale();
  const origin = useOrigin();
  const [place, setPlace] = useState(() => readSaved());
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const [cleared, setCleared] = useState(false);

  const link = `${origin}${hubPath(locale)}#move=${encodeMove(data)}`;
  const near = place && "near" in place ? place.near : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t("hub.move.copy"), link);
    }
  }

  function clearAll() {
    clearFollowing();
    clearPlan();
    clearVisits();
    clearDone();
    savePlace(null);
    setPlace(null);
    setAsking(false);
    setCleared(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <p>{t("hub.settings.text")}</p>

      <div className="flex flex-col gap-2">
        <p>
          {near
            ? t("hub.settings.place", { place: near })
            : t("hub.settings.noPlace")}
        </p>
        {near && (
          <button
            type="button"
            onClick={() => {
              savePlace(null);
              setPlace(null);
            }}
            className={`${pillButtonClass} self-start`}
          >
            {t("hub.settings.forgetPlace")}
          </button>
        )}
      </div>

      <div className={`${cardClass} flex flex-col gap-3 p-5`}>
        <h3 className="font-display text-2xl">{t("hub.move.title")}</h3>
        <p>{t("hub.move.intro")}</p>
        <p className="flex flex-wrap items-center gap-2">
          <a
            href={whatsAppLink(t("hub.move.message"), link)}
            target="_blank"
            rel="noopener"
            className={actionPillClass}
          >
            <WhatsAppIcon />
            {t("hub.move.whatsapp")}
          </a>
          <button type="button" onClick={copy} className={actionPillClass}>
            {t("hub.move.copy")}
          </button>
          <span aria-live="polite" className="text-leaf-ink font-semibold">
            {copied ? t("hub.move.copied") : ""}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-2xl">{t("hub.clear.title")}</h3>
        <p>{t("hub.clear.intro")}</p>
        {cleared && <Notice tone="success">{t("hub.clear.done")}</Notice>}
        {asking ? (
          <div className="border-kumkum/40 bg-kumkum/5 flex flex-col gap-3 rounded-2xl border p-4">
            <p className="font-semibold">{t("hub.clear.sure")}</p>
            <p className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="bg-kumkum text-on-peacock inline-flex cursor-pointer items-center rounded-full px-5 py-2 text-lg font-semibold"
              >
                {t("hub.clear.yes")}
              </button>
              <button
                type="button"
                onClick={() => setAsking(false)}
                className={`${quietButtonClass} px-5 py-2`}
              >
                {t("hub.clear.cancel")}
              </button>
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCleared(false);
              setAsking(true);
            }}
            className={`${quietButtonClass} text-kumkum self-start`}
          >
            {t("hub.clear.button")}
          </button>
        )}
      </div>
    </div>
  );
}

// A "move to a new phone" link that has just been opened: what's in it,
// and a button to add it here.
function MoveIn({ t }: { t: T }) {
  // Only drawn in the browser (after My Toran has read the phone), so the
  // address can be read straight away.
  const [offer, setOffer] = useState<MoveData | "broken" | "added" | null>(
    () => {
      const match = /^#move=(.+)$/.exec(window.location.hash);
      return match ? (decodeMove(match[1]) ?? "broken") : null;
    },
  );

  // Out of the address, so a reload doesn't ask again.
  useEffect(() => {
    if (window.location.hash.startsWith("#move=")) {
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (!offer) return null;
  if (offer === "broken")
    return <Notice tone="error">{t("hub.import.broken")}</Notice>;
  if (offer === "added")
    return <Notice tone="success">{t("hub.import.added")}</Notice>;

  function add(data: MoveData) {
    mergeFollowing(data.following);
    mergePlan(data.plan);
    mergeVisits(data.visits);
    keepEnded(data.done);
    addSlots(data.slots);
    setOffer("added");
  }

  return (
    <section
      aria-labelledby="move-in"
      className="border-peacock/40 bg-peacock/5 flex flex-col gap-3 rounded-3xl border p-5"
    >
      <h2 id="move-in" className="font-display text-3xl">
        {t("hub.import.title")}
      </h2>
      <p>
        {t("hub.import.summary", {
          mandirs: offer.following.length,
          events: offer.plan.length + offer.visits.length,
          seva: offer.done.length + offer.slots.length,
        })}
      </p>
      <p className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => add(offer)}
          className="bg-peacock text-on-peacock hover:bg-peacock-deep inline-flex cursor-pointer items-center rounded-full px-6 py-3 text-lg font-semibold"
        >
          {t("hub.import.add")}
        </button>
        <button
          type="button"
          onClick={() => setOffer(null)}
          className={quietButtonClass}
        >
          {t("hub.import.no")}
        </button>
      </p>
    </section>
  );
}

function HandsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" />
    </svg>
  );
}
