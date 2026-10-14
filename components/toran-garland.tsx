// A row of marigold and mango-leaf drops, the toran hung over a doorway.
export function ToranGarland({
  className = "h-10 w-44",
  decorative = false,
}: {
  className?: string;
  // Hidden from screen readers where it's only decoration.
  decorative?: boolean;
}) {
  const drops = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg
      viewBox="0 0 180 40"
      className={className}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "A toran garland" })}
    >
      <path
        d="M2 6 Q90 18 178 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-marigold-ink"
      />
      {drops.map((i) => {
        const x = 10 + i * 20;
        const y = 8 + 6 * Math.sin((Math.PI * (i + 0.5)) / drops.length);
        return i % 2 === 0 ? (
          <circle key={i} cx={x} cy={y + 9} r="6" className="fill-marigold" />
        ) : (
          <path
            key={i}
            d={`M${x} ${y} q6 10 0 22 q-6 -12 0 -22z`}
            className="fill-leaf"
          />
        );
      })}
    </svg>
  );
}
