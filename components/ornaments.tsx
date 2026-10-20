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

// The rangoli and the name: the top of every page and the footer.
export function Logo({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <span className="flex items-center gap-2.5">
      <RangoliMark className={size === "md" ? "size-9" : "size-8"} />
      <span
        className={`font-display leading-none ${size === "md" ? "text-[2rem]" : "text-[1.75rem]"}`}
      >
        Toran
      </span>
    </span>
  );
}

// The garland itself, repeated across the width. "night" is the gold and
// mint one for deep peacock bands; on cream it turns gold in dark mode.
export function Toran({ night = false }: { night?: boolean }) {
  return (
    <div aria-hidden="true" className={`toran ${night ? "toran-night" : ""}`} />
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
