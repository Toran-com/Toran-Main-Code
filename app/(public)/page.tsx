import { site } from "@/lib/site";

// Temporary home page until the public listing is built.
export default function ComingSoon() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <ToranGarland />
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
          {site.name}
        </h1>
        <p className="text-peacock text-2xl font-semibold">{site.tagline}</p>
        <p className="text-muted max-w-prose text-lg leading-relaxed">
          Events from mandirs across the UK in one place, and a simple way for
          committees to organise seva. We are talking to mandir committees now
          and will open in 2027.
        </p>
      </div>
      <p className="border-line text-muted border-t pt-6 text-base">
        Coming soon
      </p>
    </main>
  );
}

// A row of marigold and mango-leaf drops, the toran hung over a doorway.
function ToranGarland() {
  const drops = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg
      viewBox="0 0 180 40"
      className="h-10 w-44"
      role="img"
      aria-label="A toran garland"
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
