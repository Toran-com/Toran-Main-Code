import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CopyText } from "@/components/copy-text";
import { OpsNav } from "@/components/ops-nav";
import { TranslationLine } from "@/components/translation-line";
import {
  Card,
  Loading,
  Notice,
  pillButtonClass,
  pillPrimaryClass,
} from "@/components/ui";
import { PageShell } from "@/components/page-shell";
import { requireToranAdmin } from "@/lib/auth";
import { LOCALES } from "@/lib/i18n";
import { pageTitle } from "@/lib/site";
import { loadReviewLines } from "@/lib/translation-pack";
import {
  REVIEW_LANGUAGES,
  reviewerText,
  reviewLocale,
  stampsFor,
  toReview,
} from "@/lib/translation-review";
import { markChecked } from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Translations · Admin"),
  robots: { index: false },
};

export default function OpsTranslationsPage(
  props: PageProps<"/ops/translations">,
) {
  return (
    <PageShell title="Translations" wide>
      <OpsNav current="/ops/translations" />
      <Suspense fallback={<Loading />}>
        <Translations {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Translations({ searchParams }: PageProps<"/ops/translations">) {
  await requireToranAdmin("/ops/translations");
  const query = await searchParams;
  const locale = reviewLocale(query.lang);
  const language = REVIEW_LANGUAGES[locale].english;
  const here = `/ops/translations?lang=${locale}`;
  const { lines, saved } = await loadReviewLines(locale);
  const fresh = toReview(lines);
  // What's new, unless everything has been checked or all was asked for.
  const all = query.show === "all" || !fresh.length;
  const shown = all ? lines : fresh;
  const checked = Number(query.checked) || 0;

  return (
    <>
      <nav aria-label="Language" className="flex flex-wrap gap-2">
        {(
          Object.keys(REVIEW_LANGUAGES) as (keyof typeof REVIEW_LANGUAGES)[]
        ).map((l) => (
          <Link
            key={l}
            href={`/ops/translations?lang=${l}`}
            aria-current={l === locale ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-base font-semibold no-underline ${
              l === locale
                ? "border-peacock bg-peacock text-on-peacock"
                : "border-line text-ink hover:bg-sunk"
            }`}
          >
            {REVIEW_LANGUAGES[l].english}
          </Link>
        ))}
      </nav>
      {!LOCALES[locale].ready && (
        <Notice>
          The {language} is a <strong>draft</strong> and isn&apos;t shown on the
          site. Before it is, a native {language} speaker (ideally someone from
          a mandir committee) should check every line. Send them the pack below;
          then the corrections go into <code>lib/i18n/{locale}.ts</code> and{" "}
          <code>ready</code> is switched on in <code>lib/i18n/index.ts</code>.
        </Notice>
      )}
      {checked > 0 && (
        <Notice tone="success">
          {checked === 1 ? "1 line" : `${checked} lines`} marked as checked.
          They&apos;ll come back only if their wording changes.
        </Notice>
      )}
      {query.error === "nothing" && (
        <Notice tone="error">
          Nothing was marked: the wording changed since the page was opened.
          Have a look at the list again.
        </Notice>
      )}
      {query.error === "failed" && (
        <Notice tone="error">
          That didn&apos;t save. Try again in a minute.
        </Notice>
      )}
      {!saved && (
        <Notice tone="error">
          Couldn&apos;t read which lines have been checked, so every line is
          shown as new.
        </Notice>
      )}

      <Card>
        <h2 className="text-xl font-bold">The review pack</h2>
        <p className="text-muted">
          {fresh.length
            ? `${fresh.length} of ${lines.length} lines are new or have changed since a reviewer last checked them.`
            : `All ${lines.length} lines have been checked. New or changed wording shows up here.`}
        </p>
        {fresh.length > 0 && (
          <nav aria-label="Lines to show" className="flex flex-wrap gap-2">
            {(
              [
                ["", `What's new (${fresh.length})`, !all],
                ["all", `Every line (${lines.length})`, all],
              ] as const
            ).map(([show, label, current]) => (
              <Link
                key={show}
                href={show ? `${here}&show=${show}` : here}
                aria-current={current ? "page" : undefined}
                className={`rounded-full border px-4 py-1.5 text-base font-semibold no-underline ${
                  current
                    ? "border-peacock bg-peacock text-on-peacock"
                    : "border-line text-ink hover:bg-sunk"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/ops/translations/print?lang=${locale}${all && fresh.length ? "&show=all" : ""}`}
            className={pillButtonClass}
          >
            Print these {shown.length} lines
          </Link>
          <CopyText text={reviewerText(shown, locale)} label="Copy the list" />
        </div>
        <p className="text-muted text-base">
          The printout puts English and {language} side by side with room to
          write a better version. The numbers stay the same in every pack, so a
          reply like &ldquo;312: better as …&rdquo; always means the same line.
        </p>
      </Card>

      {saved && fresh.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold">When the reviewer has replied</h2>
          <p className="text-muted">
            Once their corrections are on the site, mark what&apos;s new as
            checked. The next pack then only has lines added or changed after
            today.
          </p>
          <form action={markChecked}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="lines" value={stampsFor(fresh)} />
            <button type="submit" className={pillPrimaryClass}>
              Mark the {fresh.length} new lines as checked
            </button>
          </form>
        </Card>
      )}

      <ol className="flex flex-col gap-3">
        {shown.map((line) => (
          <li
            key={line.key}
            className="border-line bg-surface shadow-card grid gap-2 rounded-2xl border p-4 sm:grid-cols-[6rem_1fr_1fr]"
          >
            <TranslationLine line={line} locale={locale} />
          </li>
        ))}
      </ol>
    </>
  );
}
