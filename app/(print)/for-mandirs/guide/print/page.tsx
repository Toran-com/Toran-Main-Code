import type { Metadata } from "next";
import Link from "next/link";
import { Toran } from "@/components/ornaments";
import { PrintButton } from "@/components/print-button";
import { GUIDE_PATH, HANDOUT_STEPS } from "@/lib/committee-guide";
import { qrPath } from "@/lib/qr";
import { pageMetadata, siteUrl } from "@/lib/site";

// A one-page A4 handout of the committee guide, for committee meetings and
// mandir visits, with a QR code to the full guide.

export const metadata: Metadata = {
  ...pageMetadata("Print: committee guide"),
  robots: { index: false },
};

export default function GuideHandoutPage() {
  const url = `${siteUrl()}${GUIDE_PATH}`;
  const qr = qrPath(url);
  return (
    <>
      <div className="flex flex-col gap-3 print:hidden">
        <Link
          href={GUIDE_PATH}
          className="text-peacock self-start font-semibold"
        >
          ← Back to the committee guide
        </Link>
        <p className="text-muted">
          A one-page A4 handout for your committee meeting. The QR code opens
          the full guide.
        </p>
        <PrintButton label="Print this page" />
      </div>

      <article className="flex flex-col gap-5 [print-color-adjust:exact]">
        <Toran />
        <header className="border-line flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="flex flex-col gap-1">
            <p className="text-marigold-ink text-base font-semibold tracking-[0.12em] uppercase">
              For mandir committees
            </p>
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight">
              Your mandir&apos;s events on Toran
            </h1>
            <p className="text-muted text-xl">
              Where families find what&apos;s on and share it. Free for mandirs.
            </p>
            <p className="text-muted break-all">Full guide: {url}</p>
          </div>
          <figure className="flex shrink-0 flex-col items-start gap-1 sm:items-center">
            <svg
              viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
              role="img"
              aria-label={`QR code for ${url}`}
              className="size-28 shrink-0 bg-white"
              shapeRendering="crispEdges"
            >
              <path d={qr.d} fill="#000" />
            </svg>
            <figcaption className="text-base font-semibold">
              Scan for the guide
            </figcaption>
          </figure>
        </header>

        <ol className="flex flex-col gap-3">
          {HANDOUT_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="border-line flex break-inside-avoid gap-4 border-b pb-3"
            >
              <span
                aria-hidden
                className="font-display text-marigold-ink w-8 shrink-0 text-5xl leading-none"
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">{step.title}</h2>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>
    </>
  );
}
