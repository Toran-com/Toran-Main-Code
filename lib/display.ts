// Bigger text and higher contrast, chosen by the visitor and remembered
// on their phone only. Applied as data-text and data-contrast on <html>
// (app/globals.css does the rest), before the page is drawn, by the small
// script in the root layout, so a page never jumps from one size to
// another.

export const DISPLAY_KEY = "toran:display";

export const TEXT_SIZES = ["md", "lg", "xl"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export type Display = { text: TextSize; contrast: boolean };

export const STANDARD: Display = { text: "md", contrast: false };

export function readDisplay(value: string | null): Display {
  try {
    const parsed = JSON.parse(value ?? "{}") as Partial<Display>;
    return {
      text: TEXT_SIZES.includes(parsed.text as TextSize)
        ? (parsed.text as TextSize)
        : "md",
      contrast: parsed.contrast === true,
    };
  } catch {
    return STANDARD;
  }
}

// The same, as a script for <head>: it runs before anything is shown.
export const DISPLAY_SCRIPT = `try{var d=JSON.parse(localStorage.getItem(${JSON.stringify(DISPLAY_KEY)})||"{}"),h=document.documentElement;if(d.text==="lg"||d.text==="xl")h.dataset.text=d.text;if(d.contrast===true)h.dataset.contrast="high"}catch(e){}`;
