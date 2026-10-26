import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Toran } from "@/components/ornaments";
import { PrintButton } from "@/components/print-button";
import { TranslationLine } from "@/components/translation-line";
import { Loading } from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { pageTitle } from "@/lib/site";
import { loadReviewLines } from "@/lib/translation-pack";
import { toReview } from "@/lib/translation-review";

// The Gujarati review pack on paper: numbered lines, English and Gujarati
// side by side, new and changed ones marked, and room to write a better
// version. For a reviewer who'd rather mark up a printout than reply in
// WhatsApp.

export const metadata: Metadata = {
  title: pageTitle("Print: Gujarati review pack"),
  robots: { index: false },
};

export default function TranslationPackPage(
  props: PageProps<"/ops/translations/print">,
) {
  return (
    <Suspense fallback={<Loading />}>
      <Pack {...props} />
    </Suspense>
  );
}

async function Pack({ searchParams }: PageProps<"/ops/translations/print">) {
  await requireToranAdmin("/ops/translations/print");
  const query = await searchParams;
  const { lines } = await loadReviewLines();
  const fresh = toReview(lines);
  const all = query.show === "all" || !fresh.length;
  const shown = all ? lines : fresh;
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });

  return (
    <>
      <div className="flex flex-col gap-3 print:hidden">
        <Link
          href="/ops/translations"
          className="text-peacock self-start font-semibold"
        >
          ← Back to Translations
        </Link>
        <PrintButton label="Print the pack" />
      </div>

      <article className="flex flex-col gap-5 [print-color-adjust:exact]">
        <Toran />
        <header className="border-line flex flex-col gap-2 border-b pb-5">
          <p className="text-marigold-ink text-base font-semibold tracking-[0.12em] uppercase">
            Toran · {today}
          </p>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight">
            Gujarati wording to check
          </h1>
          <p className="text-xl">
            {all
              ? `All ${shown.length} lines of the site's wording.`
              : `${shown.length} lines that are new or have changed since the last check.`}
          </p>
          <p className="text-muted">
            For each line: is the Gujarati right, natural and polite? If not,
            write a better version underneath it. Words in {"{brackets}"} are
            filled in by the site, for example {"{name}"} becomes a
            mandir&apos;s name, so keep them as they are.
          </p>
        </header>

        <ol className="flex flex-col">
          {shown.map((line) => (
            <li
              key={line.key}
              className="border-line grid break-inside-avoid grid-cols-[8rem_1fr_1fr] gap-x-4 gap-y-1 border-b py-2"
            >
              <TranslationLine line={line} />
              <div
                aria-hidden
                className="border-line-strong col-start-2 col-end-4 h-8 border-b border-dashed"
              />
            </li>
          ))}
        </ol>
      </article>
    </>
  );
}
