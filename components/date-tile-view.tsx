export type DateTileProps = {
  // The date in words, read out in place of the tile.
  label: string;
  size?: "sm" | "md" | "lg";
  // Cream on the deep peacock bands.
  night?: boolean;
};

// The tile itself, from its three lines worked out already (dateTileParts
// in lib/format.ts), so browser components can show one without the date
// formatting code. Pages use DateTile (date-tile.tsx).
export function DateTileView({
  parts: { month, day, weekday },
  label,
  size = "md",
  night = false,
}: DateTileProps & {
  parts: { month: string; day: string; weekday: string };
}) {
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
