// Toran's line art: the rangoli mark beside the name, the toran hung under
// the header and over each page's bold moment, and the diya between long
// sections. All decoration, so hidden from screen readers.

const PETALS = [0, 45, 90, 135, 180, 225, 270, 315];

// An eight-petal rangoli in fine line: peacock petals, marigold buds and a
// marigold centre. "night" draws it in gold for the deep peacock bands.
export function RangoliMark({
  className = "size-10",
  night = false,
}: {
  className?: string;
  night?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      aria-hidden="true"
      className={className}
      fill="none"
      strokeLinejoin="round"
    >
      <g
        strokeWidth="9"
        className={night ? "stroke-[#e9c27a]" : "stroke-peacock"}
      >
        {PETALS.map((r) => (
          <path
            key={r}
            d="M120 120 C106 96 107 62 120 40 C133 62 134 96 120 120 Z"
            transform={`rotate(${r} 120 120)`}
          />
        ))}
      </g>
      <g
        strokeWidth="8"
        className={night ? "stroke-[#7fd6cf]" : "stroke-marigold-ink"}
      >
        {PETALS.map((r) => (
          <path
            key={r}
            d="M120 120 C112 104 112 86 120 74 C128 86 128 104 120 120 Z"
            transform={`rotate(${r + 22.5} 120 120)`}
          />
        ))}
      </g>
      <circle cx="120" cy="120" r="20" className="fill-marigold" />
    </svg>
  );
}

// Toran's mark: a T made of a toran, the garland hung over a mandir's
// door, with drops hanging from it (DESIGN.md). On light pages it sits in
// a midnight tile; on midnight ("night") it's gold line work on its own.
export function ToranMark({
  className = "size-10",
  night = false,
}: {
  className?: string;
  night?: boolean;
}) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      {!night && <rect width="48" height="48" rx="11" fill="#14213d" />}
      <path
        d="M9 13H39M24 13V37"
        stroke="#d9a441"
        strokeWidth="3.6"
        strokeLinecap="round"
        fill="none"
      />
      {[
        [13.2, 19.2],
        [18.2, 21.4],
        [29.8, 21.4],
        [34.8, 19.2],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="2.25" fill="#d9a441" />
      ))}
    </svg>
  );
}

// The mark and the name, spaced like letters carved over a doorway: the
// top of every page and the footer.
export function Logo({
  size = "md",
  night = false,
}: {
  size?: "md" | "sm";
  night?: boolean;
}) {
  return (
    <span className="flex items-center gap-3 max-[359px]:gap-2.5">
      {/* A logo keeps its size whatever the text size (lib/display.ts),
          a little smaller on the narrowest phones so the header fits. */}
      <ToranMark
        night={night}
        className={
          size === "md"
            ? "size-[34px] max-[359px]:size-[30px] sm:size-[38px]"
            : "size-[34px]"
        }
      />
      <span
        className={`font-display leading-none tracking-[0.16em] uppercase ${size === "md" ? "text-[24px] max-[379px]:text-[21px] max-[359px]:text-[19px] sm:text-[27px]" : "text-[24px]"}`}
      >
        Toran
      </span>
    </span>
  );
}

// The garland itself, repeated across the width. "night" is the gold and
// mint one for deep peacock bands; on cream it turns gold in dark mode.
export function Toran({
  night = false,
  className = "",
}: {
  night?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`toran ${night ? "toran-night" : ""} ${className}`}
    />
  );
}

// Two fine lines with a lit diya between them, between big sections.
export function DiyaDivider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-5 ${className}`}>
      <span className="bg-line-strong h-px flex-1" />
      <svg viewBox="0 0 40 32" className="h-7 w-9" strokeLinejoin="round">
        <path
          d="M20 3 C16.5 8 17 12 20 14 C23 12 23.5 8 20 3 Z"
          className="fill-marigold stroke-marigold-ink"
          strokeWidth="1.4"
        />
        <path
          d="M5 17 H35 C33 25 27 29 20 29 C13 29 7 25 5 17 Z"
          className="fill-marigold/15 stroke-marigold-ink"
          strokeWidth="1.4"
        />
      </svg>
      <span className="bg-line-strong h-px flex-1" />
    </div>
  );
}
