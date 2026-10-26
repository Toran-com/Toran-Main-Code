"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { actionPillClass, quietButtonClass } from "@/components/ui";
import { useLocale, useT } from "@/components/use-t";
import { enPlan } from "@/lib/i18n/client/plan";
import {
  addAllPlanned,
  clearPlan,
  onPlanChange,
  parsePlan,
  type Planned,
  planHref,
  planSnapshot,
  setPlanned,
} from "@/lib/plan";

// A family's plan, kept on this phone (lib/plan.ts): a button on each
// event, a link to the plan, and the plan page's buttons.

export function usePlan(): Planned[] {
  const snapshot = useSyncExternalStore(
    onPlanChange,
    planSnapshot,
    // Drawn as an empty plan first, then as saved on the phone.
    () => "",
  );
  return useMemo(() => parsePlan(snapshot), [snapshot]);
}

function Check({ on }: { on: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {on ? <path d="m5 12 5 5 9-10" /> : <path d="M12 5v14M5 12h14" />}
    </svg>
  );
}

// "Add to our plan" on an event; once added, a way to the plan.
export function PlanButton({ id, at }: Planned) {
  const t = useT(enPlan);
  const locale = useLocale();
  const plan = usePlan();
  const on = plan.some((p) => p.id === id);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setPlanned({ id, at }, !on)}
        className={`${actionPillClass} ${on ? "border-peacock bg-peacock/10" : ""}`}
      >
        <Check on={on} />
        {on ? t("plan.added") : t("plan.add")}
      </button>
      {on && (
        <Link
          href={planHref(
            locale,
            plan.map((p) => p.id),
          )}
          className="text-peacock text-base font-semibold"
        >
          {t("plan.see", { count: plan.length })} →
        </Link>
      )}
    </span>
  );
}

// "See our plan (3)", wherever events are listed, once there's a plan.
export function PlanLink() {
  const t = useT(enPlan);
  const locale = useLocale();
  const plan = usePlan();
  if (!plan.length) return null;
  return (
    <Link
      href={planHref(
        locale,
        plan.map((p) => p.id),
      )}
      className="text-peacock font-semibold"
    >
      {t("plan.see", { count: plan.length })} →
    </Link>
  );
}

// /plan with no events in its address: open the plan saved on this
// phone, or say how to start one.
export function PlanFromPhone() {
  const t = useT(enPlan);
  const locale = useLocale();
  const router = useRouter();
  const plan = usePlan();
  const ids = plan.map((p) => p.id).join(",");
  useEffect(() => {
    if (ids) router.replace(planHref(locale, ids.split(",")));
  }, [ids, locale, router]);
  if (ids) return <p className="text-muted">{t("plan.opening")}</p>;
  return (
    <div className="bg-sunk flex flex-col gap-3 rounded-3xl p-6">
      <p>{t("plan.empty")}</p>
      <Link
        href={locale === "gu" ? "/gu/whats-on" : "/whats-on"}
        className="text-peacock font-semibold"
      >
        {t("plan.find")}
      </Link>
    </div>
  );
}

// An event on the plan page, with "Take out of the plan" under it. It
// goes from the list at once, before the page is redrawn without it.
export function PlanEntry({
  id,
  shown,
  children,
}: {
  id: string;
  // Every event in this plan's address, so the page can be redrawn
  // without it.
  shown: string[];
  children: ReactNode;
}) {
  const t = useT(enPlan);
  const locale = useLocale();
  const router = useRouter();
  const plan = usePlan();
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <li className="flex flex-col pb-4">
      {children}
      <button
        type="button"
        onClick={() => {
          const event = plan.find((p) => p.id === id);
          if (event) setPlanned(event, false);
          setGone(true);
          router.replace(
            planHref(
              locale,
              shown.filter((s) => s !== id),
            ),
          );
        }}
        className="text-muted cursor-pointer text-base font-semibold underline"
      >
        {t("plan.remove")}
      </button>
    </li>
  );
}

// For a plan someone sent: save its events on this phone too. And for
// your own: start again.
export function PlanButtons({ events }: { events: Planned[] }) {
  const t = useT(enPlan);
  const locale = useLocale();
  const router = useRouter();
  const plan = usePlan();
  const missing = events.filter((e) => !plan.some((p) => p.id === e.id));
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      {missing.length > 0 ? (
        <button
          type="button"
          onClick={() => addAllPlanned(missing)}
          className={quietButtonClass}
        >
          {t("plan.addAll")}
        </button>
      ) : (
        events.length > 0 && (
          <span className="text-leaf-ink font-semibold">
            ✓ {t("plan.allAdded")}
          </span>
        )
      )}
      {plan.length > 0 && (
        <button
          type="button"
          onClick={() => {
            clearPlan();
            router.replace(locale === "gu" ? "/gu/plan" : "/plan");
          }}
          className="text-muted cursor-pointer text-base font-semibold underline"
        >
          {t("plan.clear")}
        </button>
      )}
    </div>
  );
}
