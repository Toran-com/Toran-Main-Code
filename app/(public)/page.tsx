import Link from "next/link";
import { ToranGarland } from "@/components/toran-garland";
import { quietButtonClass } from "@/components/ui";
import { site } from "@/lib/site";
import { translator } from "@/lib/i18n";

// Temporary home page until the public listing is built.
export default function ComingSoon() {
  const t = translator();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <ToranGarland />
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
          {site.name}
        </h1>
        <p className="text-peacock text-2xl font-semibold">
          {t("home.tagline")}
        </p>
        <p className="text-muted max-w-prose text-lg leading-relaxed">
          {t("home.intro")}
        </p>
      </div>
      <nav aria-label="Explore" className="flex flex-wrap gap-3">
        <Link href="/whats-on" className={quietButtonClass}>
          {t("home.whatsOn")}
        </Link>
        <Link href="/mandirs" className={quietButtonClass}>
          {t("home.mandirs")}
        </Link>
        <Link href="/festivals" className={quietButtonClass}>
          {t("home.festivals")}
        </Link>
      </nav>
      <p className="border-line text-muted border-t pt-6 text-base">
        {t("home.comingSoon")}
      </p>
    </main>
  );
}
