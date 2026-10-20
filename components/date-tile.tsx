import { dateTileParts } from "@/lib/format";

// A day as a little page from a panchang: the month in kumkum, the day in
// the headline serif, and the weekday. The full date is for screen
// readers, which would otherwise read "NOV 8 Sun".
export function DateTile({
  date,
  label,
  size = "md",
  night = false,
}: {
  // A day (YYYY-MM-DD) or a moment (an ISO time, shown on its UK day).
  date: string;
  // The date in words, read out in place of the tile.
  label: string;
  size?: "sm" | "md" | "lg";
  // Cream on the deep peacock bands.
  night?: boolean;
}) {
  const { month, day, weekday } = dateTileParts(date);
  const box = {
    sm: "w-16 rounded-2xl pt-2 pb-1.5",
    md: "w-[4.25rem] rounded-2xl pt-2 pb-1.5 sm:w-20 sm:pt-2.5 sm:pb-2",
    lg: "w-24 rounded-3xl pt-3 pb-2.5 sm:w-28",
  }[size];
  const number = {
    sm: "text-[2.125rem] leading-[2rem]",
    md: "text-[2.25rem] leading-[2.125rem] sm:text-[2.5rem] sm:leading-[2.375rem]",
    lg: "text-[3.25rem] leading-[3rem] sm:text-[3.75rem] sm:leading-[3.5rem]",
  }[size];
  return (
    <span
      className={`flex shrink-0 flex-col items-center self-start ${box} ${
        night
          ? "bg-on-night text-[#1b1a2c]"
          : "bg-tile border-tile-line text-ink border"
      }`}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={`text-base leading-snug font-bold tracking-[0.08em] ${night ? "text-[#c21e3a]" : "text-date"}`}
      >
        {month}
      </span>
      <span aria-hidden="true" className={`font-display ${number}`}>
        {day}
      </span>
      <span
        aria-hidden="true"
        className={`text-base leading-snug ${night ? "text-[#5d5a6e]" : "text-muted"}`}
      >
        {weekday}
      </span>
    </span>
  );
}
