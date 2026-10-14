import type { Metadata } from "next";
import { Suspense } from "react";
import { CopyText } from "@/components/copy-text";
import { OpsNav } from "@/components/ops-nav";
import { Card, Loading, Notice, PageShell } from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { LOCALES, MESSAGES, type MessageKey } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Translations · Admin"),
  robots: { index: false },
};

export default function OpsTranslationsPage() {
  return (
    <PageShell title="Translations" wide>
      <OpsNav current="/ops/translations" />
      <Suspense fallback={<Loading />}>
        <Translations />
      </Suspense>
    </PageShell>
  );
}

async function Translations() {
  await requireToranAdmin("/ops/translations");
  const keys = Object.keys(en) as MessageKey[];
  const gu = MESSAGES.gu;
  // Numbered so a reviewer can reply "7: better as …".
  const forReviewer = [
    "Toran: Gujarati wording to check. For each line, is the Gujarati right, natural and polite? Reply with the number and a better version.",
    ...keys.map(
      (key, i) =>
        `${i + 1}. English: ${en[key]}\n    ગુજરાતી: ${gu[key] ?? ""}`,
    ),
  ].join("\n\n");

  return (
    <>
      {!LOCALES.gu.ready && (
        <Notice>
          The Gujarati is a <strong>draft</strong> and isn&apos;t shown on the
          site. Before it is, a native Gujarati speaker (ideally someone from a
          mandir committee) should check every line. Copy the list below and
          send it to them; then the corrections go into{" "}
          <code>lib/i18n/gu.ts</code> and <code>ready</code> is switched on in{" "}
          <code>lib/i18n/index.ts</code>.
        </Notice>
      )}
      <Card>
        <h2 className="text-xl font-bold">Send to a reviewer</h2>
        <p className="text-muted">
          {keys.length} lines, numbered, English then Gujarati.
        </p>
        <CopyText text={forReviewer} label="Copy the list" />
      </Card>
      <ol className="flex flex-col gap-3">
        {keys.map((key, i) => (
          <li
            key={key}
            className="border-line bg-surface shadow-card grid gap-2 rounded-2xl border p-4 sm:grid-cols-[3rem_1fr_1fr]"
          >
            <span className="text-muted font-semibold">{i + 1}</span>
            <p>{en[key]}</p>
            <p lang={LOCALES.gu.lang}>{gu[key]}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
