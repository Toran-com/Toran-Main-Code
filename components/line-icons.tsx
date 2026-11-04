import type { ReactNode } from "react";

// Toran's line icons (DESIGN.md): drawn on a 24px grid with a 2px rounded
// line in the text's own colour, like the bar along the bottom of a phone.
// They replace emoji, which look different on every phone and say little.
// Always decoration beside words, so hidden from screen readers.
export type LineIconName =
  | "pin"
  | "heart"
  | "kitchen"
  | "parking"
  | "shoes"
  | "decorations"
  | "prasad"
  | "children"
  | "cleaning"
  | "welcome"
  | "other"
  | "morning"
  | "afternoon"
  | "evening";

const PATHS: Record<LineIconName, ReactNode> = {
  // A map pin.
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  ),
  // A pot with steam.
  kitchen: (
    <>
      <path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" />
      <path d="M2.5 11h19M9 4.5c-.8 1 .8 2-0 3M15 4.5c-.8 1 .8 2 0 3" />
    </>
  ),
  // A car, from the side.
  parking: (
    <>
      <path d="M3.5 16.5v-3.2l2-4.3A2 2 0 0 1 7.3 8h9.4a2 2 0 0 1 1.8 1l2 4.3v3.2z" />
      <path d="M3.5 13.3h17" />
      <circle cx="7.5" cy="17" r="1.8" />
      <circle cx="16.5" cy="17" r="1.8" />
    </>
  ),
  // A shoe.
  shoes: (
    <path d="M3 17.5V8.5h5l1.5 3.5 4 1.5 5.5 1A2.5 2.5 0 0 1 21 17v.5zM3 17.5h18" />
  ),
  // A diya.
  decorations: (
    <>
      <path d="M12 3.5c1.8 2.2 2.4 3.6 2.4 4.7a2.4 2.4 0 0 1-4.8 0c0-1.1.6-2.5 2.4-4.7z" />
      <path d="M3.5 13h17c-.7 4-4.2 6.5-8.5 6.5S4.2 17 3.5 13z" />
    </>
  ),
  // A plate of sweets.
  prasad: (
    <>
      <path d="M3 15h18M5 15c.5 2.5 3.4 4 7 4s6.5-1.5 7-4" />
      <circle cx="9" cy="11.5" r="2.5" />
      <circle cx="15" cy="11.5" r="2.5" />
      <circle cx="12" cy="7.5" r="2.5" />
    </>
  ),
  // A child.
  children: (
    <>
      <circle cx="12" cy="6" r="2.5" />
      <path d="M12 9.5v6M8 12l4-2 4 2M9.5 21l2.5-5.5 2.5 5.5" />
    </>
  ),
  // A broom.
  cleaning: (
    <>
      <path d="M15 3 10.5 11.5" />
      <path d="M7 11h7l2 9.5H5z" />
      <path d="M8.5 15.5 8 20.5M12.5 15.5l.3 5" />
    </>
  ),
  // An open door: a welcome.
  welcome: (
    <>
      <path d="M5 20.5V4h10v16.5M3 20.5h18" />
      <path d="M15 4l4 2v14.5" />
      <circle cx="12.5" cy="12.5" r=".6" />
    </>
  ),
  // A sparkle.
  other: (
    <path d="M12 3c.6 4.2 2.4 6 6.5 6.5-4.1.6-5.9 2.4-6.5 6.5-.6-4.1-2.4-5.9-6.5-6.5C9.6 9 11.4 7.2 12 3zM18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z" />
  ),
  // The sun on the horizon.
  morning: (
    <>
      <path d="M3 18h18M7 18a5 5 0 0 1 10 0" />
      <path d="M12 7v2.5M5.6 10.6l1.8 1.8M18.4 10.6l-1.8 1.8" />
    </>
  ),
  // The sun.
  afternoon: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  // The moon.
  evening: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
};

export function LineIcon({
  name,
  className = "size-6",
}: {
  name: LineIconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
