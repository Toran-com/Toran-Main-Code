import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadProblem } from "@/components/public-shell";
import { ReportMessage } from "@/components/report-message";
import { buttonClass, Card, inputClass } from "@/components/ui";
import { getMandir, listMandirs } from "@/lib/directory";
import { pageMetadata } from "@/lib/site";
import { reportEvent } from "./actions";
import { localePath, pageLocale, pageT } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...pageMetadata(pageT()("report.title")),
    robots: { index: false },
  };
}

// Static like the mandir page, so an unknown mandir is a proper 404. The
// thanks or problem after sending is shown by ReportMessage.
export const ensureStatic = "navigation";

const NO_MANDIRS = "no-mandirs-yet";

export async function generateStaticParams() {
  const result = await listMandirs();
  const slugs = result.state === "ok" ? result.data.map((m) => m.slug) : [];
  return (slugs.length ? slugs : [NO_MANDIRS]).map((slug) => ({ slug }));
}

export default async function TellUsPage({
  params,
}: PageProps<"/mandirs/[slug]/tell-us">) {
  const { slug } = await params;
  const t = pageT();
  const result = await getMandir(slug);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what={t("load.mandirPage")} />;
  }
  if (!result.data) notFound();
  const mandir = result.data;
  const here = localePath(`/mandirs/${mandir.slug}/tell-us`);
  return (
    <>
      <Link
        href={localePath(`/mandirs/${mandir.slug}`)}
        className="text-peacock self-start font-semibold"
      >
        ← {mandir.name}
      </Link>
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {t("report.title")}
        </h1>
        <p className="text-muted text-lg">
          {t("report.intro", { name: mandir.name, town: mandir.town })}
        </p>
      </div>

      <Suspense>
        <ReportMessage again={here} />
      </Suspense>

      <Card>
        <form action={reportEvent} className="flex flex-col gap-5">
          <input type="hidden" name="slug" value={mandir.slug} />
          <input type="hidden" name="lang" value={pageLocale()} />
          <label className="flex flex-col gap-2">
            <span className="font-semibold">{t("report.what")}</span>
            <input
              name="title"
              required
              minLength={2}
              maxLength={120}
              placeholder={t("report.whatExample")}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="font-semibold">{t("report.date")}</span>
              <input name="date" type="date" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">{t("report.starts")}</span>
              <input name="time" type="time" className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">{t("report.more")}</span>
            <textarea
              name="summary"
              maxLength={280}
              rows={3}
              placeholder={t("report.moreExample")}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">{t("report.where")}</span>
            <span className="text-muted -mt-1 text-base">
              {t("report.whereHint")}
            </span>
            <input
              name="link"
              type="url"
              inputMode="url"
              maxLength={300}
              placeholder="https://"
              className={inputClass}
            />
          </label>
          {/* Left empty by people; spam-sending programs fill it in. */}
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden"
          >
            <label>
              Leave this empty
              <input
                name="company"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </label>
          </div>
          <p className="text-muted text-base">{t("report.privacy")}</p>
          <button type="submit" className={buttonClass}>
            {t("report.send")}
          </button>
        </form>
      </Card>
    </>
  );
}
