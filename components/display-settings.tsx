"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/components/use-t";
import {
  type Display,
  DISPLAY_KEY,
  readDisplay,
  STANDARD,
  TEXT_SIZES,
  type TextSize,
} from "@/lib/display";
import { enDisplay } from "@/lib/i18n/client/display";

const CHANGED = "toran:display-changed";

function subscribe(update: () => void) {
  window.addEventListener(CHANGED, update);
  return () => window.removeEventListener(CHANGED, update);
}
// What's showing now, as set by the script in <head> or a choice here.
const current = () => {
  const { text, contrast } = document.documentElement.dataset;
  return `${text ?? "md"}|${contrast === "high"}`;
};
const standard = () => "md|false";

function choose(display: Display) {
  const html = document.documentElement;
  if (display.text === "md") delete html.dataset.text;
  else html.dataset.text = display.text;
  if (display.contrast) html.dataset.contrast = "high";
  else delete html.dataset.contrast;
  try {
    if (display.text === STANDARD.text && !display.contrast) {
      localStorage.removeItem(DISPLAY_KEY);
    } else {
      localStorage.setItem(DISPLAY_KEY, JSON.stringify(display));
    }
  } catch {
    // Private browsing: it still applies to this page.
  }
  window.dispatchEvent(new Event(CHANGED));
}

const LETTER: Record<TextSize, string> = {
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl",
};

// "Aa": bigger text and higher contrast, for anyone who finds the page
// hard to read. Remembered on this phone only.
export function DisplaySettings() {
  const t = useT(enDisplay);
  const [text, contrast] = useSyncExternalStore(
    subscribe,
    current,
    standard,
  ).split("|");
  const display = readDisplay(
    JSON.stringify({ text, contrast: contrast === "true" }),
  );
  return (
    <details className="group relative">
      <summary
        aria-label={t("display.button")}
        title={t("display.button")}
        className="text-ink hover:bg-sunk inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-full font-semibold transition-colors [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true" className="text-base leading-none">
          A<span className="text-xl">a</span>
        </span>
      </summary>
      <div className="border-line bg-surface shadow-lift absolute top-full right-0 z-40 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-4 rounded-2xl border p-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">{t("display.size")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {TEXT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={display.text === size}
                onClick={() => choose({ ...display, text: size })}
                className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-2 py-2 ${
                  display.text === size
                    ? "border-peacock bg-peacock text-on-peacock"
                    : "border-line-strong text-ink hover:border-peacock/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`${LETTER[size]} font-bold`}
                >
                  A
                </span>
                <span className="text-base">{t(`display.${size}`)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          role="switch"
          aria-checked={display.contrast}
          onClick={() => choose({ ...display, contrast: !display.contrast })}
          className="flex cursor-pointer items-center justify-between gap-3 text-left font-semibold"
        >
          {t("display.contrast")}
          <span
            aria-hidden="true"
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              display.contrast ? "bg-peacock" : "bg-line-strong"
            }`}
          >
            <span
              className={`bg-surface absolute top-1 size-5 rounded-full transition-all ${
                display.contrast ? "left-6" : "left-1"
              }`}
            />
          </span>
        </button>
        <p className="text-muted text-base">{t("display.saved")}</p>
      </div>
    </details>
  );
}
