"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  buttonClass,
  inputClass,
  pillButtonClass,
  quietButtonClass,
} from "@/components/ui";
import { useT } from "@/components/use-t";
import { outcodeNear } from "@/lib/geo";
import { enPlace } from "@/lib/i18n/client/place";
import { placeHref, readSaved, savePlace as save } from "@/lib/place-memory";

// "Where are you?": the place What's on and the festival season pages show
// events near. A line saying where ("Near HA9 · 15 miles") with "Change",
// which opens a pop-up: the browser's location (turned into the nearest
// postcode district by postcodes.io, in the browser, so Toran only sees
// the district), a typed postcode, or all of the UK. The answer is kept
// on the phone, so the next visit starts near the same place. On What's
// on, the pop-up opens by itself the first time; a link can open it
// with ?pick=1.

const noSubscribe = () => () => {};

// Opens the pop-up (shown in the page first when the address asks, ?pick=1).
function popUp(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (dialog.open) dialog.close();
  dialog.showModal();
  // Start on the main choice rather than ✕.
  dialog.querySelector<HTMLElement>("[data-first]")?.focus();
}

export function PlacePicker({
  page,
  near,
  within,
  radii,
  status,
  region = "",
  keep = "",
  ask = false,
  pick = false,
}: {
  // The page to show events on: What's on or a season's page.
  page: string;
  near: string;
  within: number;
  radii: readonly number[];
  // Whether the postcode in the address was found.
  status: "none" | "found" | "unknown" | "unavailable";
  region?: string;
  // The visitor's other choices (type, day) as a query string.
  keep?: string;
  // Open the pop-up by itself the first time.
  ask?: boolean;
  // The address asks for the pop-up (?pick=1).
  pick?: boolean;
}) {
  const t = useT(enPlace);
  const router = useRouter();
  const box = useRef<HTMLDialogElement>(null);
  const chose = useRef(false);
  const supported = useSyncExternalStore(
    noSubscribe,
    () => "geolocation" in navigator,
    // Drawn from the start, so the pop-up can open on it.
    () => true,
  );
  const [miles, setMiles] = useState(within);
  const [state, setState] = useState<"idle" | "finding" | "denied" | "failed">(
    "idle",
  );

  // First visit: ask. Later visits: the place this phone chose last time.
  useEffect(() => {
    const saved = readSaved();
    if (status === "unknown" && saved && "near" in saved && saved.near === near)
      save(null);
    if (pick) {
      popUp(box.current);
      return;
    }
    if (near || region) return;
    if (saved && "near" in saved) {
      router.replace(placeHref(page, keep, saved));
    } else if (!saved && ask) {
      popUp(box.current);
    }
  }, [near, region, status, pick, ask, page, keep, router]);

  function choose(place: string, distance: number) {
    save({ near: place, within: distance });
    chose.current = true;
    setState("idle");
    box.current?.close();
    router.push(placeHref(page, keep, { near: place, within: distance }));
  }

  // Closed without choosing (✕ or Escape): don't ask again.
  function closed() {
    if (box.current?.open) return;
    const choseOne = chose.current;
    chose.current = false;
    if (choseOne) return;
    if (!readSaved()) save({ skip: true });
    if (pick) {
      router.replace(
        placeHref(page, keep, near ? { near, within } : { region }),
      );
    }
  }

  function everything(event: MouseEvent) {
    event.preventDefault();
    save({ skip: true });
    chose.current = true;
    box.current?.close();
    router.push(placeHref(page, keep, { region }));
  }

  function typed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("near") ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 10);
    if (value) choose(value, miles);
  }

  function findMe() {
    setState("finding");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const outcode = await outcodeNear({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          if (!outcode) throw new Error("No district near there");
          choose(outcode, miles);
        } catch {
          setState("failed");
        }
      },
      (error) =>
        setState(error.code === error.PERMISSION_DENIED ? "denied" : "failed"),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  const placed = status === "found";
  const keptFields = [...new URLSearchParams(keep)];

  return (
    <>
      <div className="border-line bg-surface shadow-card flex items-center justify-between gap-3 rounded-full border py-2 pr-2 pl-5">
        <p className="min-w-0 truncate font-semibold">
          <span aria-hidden="true">📍 </span>
          {near && placed
            ? t("place.near", { place: near.toUpperCase(), miles: within })
            : t("place.everywhere")}
        </p>
        <a
          href={placeHref(page, keep, { near, within, region, pick: true })}
          onClick={(event) => {
            event.preventDefault();
            popUp(box.current);
          }}
          aria-haspopup="dialog"
          className={`${pillButtonClass} shrink-0`}
        >
          {near && placed ? t("place.change") : t("place.choose")}
        </a>
      </div>

      <dialog
        ref={box}
        open={pick}
        onClose={closed}
        aria-labelledby="place-title"
        className="bg-surface text-ink m-auto w-[min(28rem,calc(100%-2rem))] rounded-3xl p-0 backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2
              id="place-title"
              className="font-display text-4xl leading-tight"
            >
              {t("place.title")}
            </h2>
            <form method="dialog">
              <button
                type="submit"
                aria-label={t("place.close")}
                className="text-muted hover:text-ink -mt-1 -mr-2 cursor-pointer rounded-full p-2 text-2xl leading-none"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </form>
          </div>

          {supported && (
            <>
              <button
                type="button"
                data-first
                onClick={findMe}
                disabled={state === "finding"}
                className={`${buttonClass} text-xl`}
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
                {state === "finding"
                  ? t("place.finding")
                  : t("place.useLocation")}
              </button>
              {(state === "denied" || state === "failed") && (
                <p className="text-muted -mt-2 text-base" aria-live="polite">
                  {state === "denied" ? t("place.denied") : t("place.failed")}
                </p>
              )}
              <p className="text-muted flex items-center gap-3 text-base before:h-px before:flex-1 before:bg-current/25 after:h-px after:flex-1 after:bg-current/25">
                {t("place.or")}
              </p>
            </>
          )}

          <form action={page} onSubmit={typed} className="flex flex-col gap-3">
            <label htmlFor="place-near" className="font-semibold">
              {t("place.postcode")}
            </label>
            <input
              id="place-near"
              name="near"
              required
              defaultValue={near}
              placeholder={t("place.example")}
              autoComplete="postal-code"
              className={inputClass}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="font-semibold">{t("place.within")}</span>
                <select
                  name="within"
                  value={miles}
                  onChange={(event) => setMiles(Number(event.target.value))}
                  className={`${inputClass} w-auto py-2`}
                >
                  {radii.map((r) => (
                    <option key={r} value={r}>
                      {t("place.miles", { miles: r })}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className={`${supported ? quietButtonClass : buttonClass} flex-1 basis-36 py-2`}
              >
                {t("place.show")}
              </button>
            </div>
            {keptFields.map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
          </form>

          <a
            href={placeHref(page, keep, { region })}
            onClick={everything}
            className="text-peacock text-center font-semibold underline underline-offset-4"
          >
            {t("place.everything")}
          </a>
          <p className="text-muted -mt-2 text-center text-base">
            {t("place.saved")}
          </p>
        </div>
      </dialog>
    </>
  );
}
