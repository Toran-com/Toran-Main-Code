import { ToranGarland } from "@/components/toran-garland";
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
