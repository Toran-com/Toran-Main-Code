"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { outcodeNear } from "@/lib/geo";

const noSubscribe = () => () => {};

type Labels = {
  field: string;
  button: string;
  finding: string;
  denied: string;
  failed: string;
};

// What's on's "Near me": asks the browser where the visitor is, turns that
// into the nearest postcode district in the browser (postcodes.io), and
// shows events near it, as if they'd typed it. Toran only ever sees the
// district. Wraps the postcode field ("input", with id "near"); the button
// shows only where the browser can give a location.
export function NearMe({
  labels,
  input,
  page = "/whats-on",
}: {
  labels: Labels;
  input: ReactNode;
  // Which page to search: What's on, or a festival season's page.
  page?: string;
}) {
  const router = useRouter();
  const supported = useSyncExternalStore(
    noSubscribe,
    () => "geolocation" in navigator,
    () => false,
  );
  const [state, setState] = useState<"idle" | "finding" | "denied" | "failed">(
    "idle",
  );

  function findMe(form: HTMLFormElement | null) {
    setState("finding");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const outcode = await outcodeNear({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          if (!outcode) throw new Error("No district near there");
          const query = new URLSearchParams();
          if (form) {
            for (const [name, value] of new FormData(form)) {
              if (typeof value === "string" && value) query.set(name, value);
            }
          }
          query.set("near", outcode);
          setState("idle");
          router.push(`${page}?${query}`);
        } catch {
          setState("failed");
        }
      },
      (error) =>
        setState(error.code === error.PERMISSION_DENIED ? "denied" : "failed"),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <label htmlFor="near" className="font-semibold">
          {labels.field}
        </label>
        {supported && (
          <button
            type="button"
            onClick={(event) => findMe(event.currentTarget.form)}
            disabled={state === "finding"}
            className="text-peacock inline-flex cursor-pointer items-center gap-1.5 rounded-full py-1 text-base font-semibold underline-offset-4 hover:underline disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={`size-4 ${state === "finding" ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {state === "finding" ? labels.finding : labels.button}
          </button>
        )}
      </div>
      {input}
      {(state === "denied" || state === "failed") && (
        <p className="text-muted text-base" aria-live="polite">
          {state === "denied" ? labels.denied : labels.failed}
        </p>
      )}
    </div>
  );
}
