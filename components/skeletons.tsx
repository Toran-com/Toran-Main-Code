import { pageT } from "@/lib/i18n/page";

// What a page shows for the moment its list is on the way: the shape of
// what's coming (date tiles and lines, a map, cards) in soft grey, so the
// page doesn't jump when it arrives and it's clear something is loading.
// Screen readers hear "Loading…" once. The shimmer stops when the phone
// asks for less motion.

const block = "bg-sunk rounded-2xl animate-pulse motion-reduce:animate-none";

function Loading({ children }: { children: React.ReactNode }) {
  const t = pageT();
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">{t("shell.loading")}</span>
      <div aria-hidden="true" className="flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
}

// One event row: a date tile, then its name and two lines under it.
function EventRow({ wide = 70 }: { wide?: number }) {
  return (
    <div className="flex gap-4 py-5 sm:gap-6 sm:py-6">
      <div className={`${block} h-[5.25rem] w-[4.25rem] shrink-0 sm:w-20`} />
      <div className="flex flex-1 flex-col gap-3 pt-1">
        <div className={`${block} h-6`} style={{ width: `${wide}%` }} />
        <div className={`${block} h-5 w-1/2`} />
        <div className={`${block} h-5 w-1/3`} />
      </div>
    </div>
  );
}

function EventRows({ count = 4 }: { count?: number }) {
  const widths = [72, 58, 80, 64, 70, 52];
  return (
    <div className="flex flex-col">
      <div className={`${block} mb-2 h-9 w-48`} />
      <div className="divide-line flex flex-col divide-y">
        {widths.slice(0, count).map((w) => (
          <EventRow key={w} wide={w} />
        ))}
      </div>
    </div>
  );
}

// What's on: the choices on the left from laptop size up, events beside.
export function WhatsOnSkeleton() {
  return (
    <Loading>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-3">
          <div className={`${block} h-14 rounded-full`} />
          <div className="flex gap-2">
            <div className={`${block} h-10 w-28 rounded-full`} />
            <div className={`${block} h-10 w-24 rounded-full`} />
          </div>
          <div className={`${block} h-5 w-24`} />
        </div>
        <EventRows count={5} />
      </div>
    </Loading>
  );
}

// A list of events under a day heading (festival and season pages).
export function EventListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Loading>
      <EventRows count={count} />
    </Loading>
  );
}

// Mandirs: the search box, the map or list switch, then the map.
export function MandirsSkeleton() {
  return (
    <Loading>
      <div className="flex flex-col gap-2">
        <div className={`${block} h-6 w-40`} />
        <div className={`${block} h-14`} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className={`${block} h-5 w-32`} />
        <div className={`${block} h-12 w-52 rounded-full`} />
      </div>
      <div className={`${block} h-[26rem] rounded-3xl sm:h-[32rem]`} />
    </Loading>
  );
}

// Festivals: a month heading over rows with a date tile each.
export function FestivalsSkeleton() {
  return (
    <Loading>
      {[0, 1].map((month) => (
        <div key={month} className="flex flex-col gap-2">
          <div className={`${block} h-9 w-44`} />
          <div className="divide-line flex flex-col divide-y">
            {[66, 48, 74].map((w) => (
              <EventRow key={w} wide={w} />
            ))}
          </div>
        </div>
      ))}
    </Loading>
  );
}

// Seva: cards, each a role with its slots.
export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Loading>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="border-line flex flex-col gap-3 rounded-3xl border p-5 sm:p-7"
          >
            <div className={`${block} h-7 w-2/3`} />
            <div className={`${block} h-5 w-1/2`} />
            <div className={`${block} h-5 w-5/6`} />
            <div className={`${block} mt-2 h-11 w-40 rounded-full`} />
          </div>
        ))}
      </div>
    </Loading>
  );
}
