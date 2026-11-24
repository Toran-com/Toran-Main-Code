import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadProblem } from "@/components/public-shell";
import { RequestMessage } from "@/components/request-message";
import { buttonClass, Card, inputClass } from "@/components/ui";
import { getMandir, listMandirs } from "@/lib/directory";
import { localePath, pageLocale, pageT } from "@/lib/i18n/page";
import { pageMetadata } from "@/lib/site";
import { sendRequest } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...pageMetadata(pageT()("request.button")),
    robots: { index: false },
  };
}

// Static like the mandir page. Only a claimed mandir whose committee lists
// what families can ask for has this page (decision 0025).
export const ensureStatic = "navigation";

const NO_MANDIRS = "no-mandirs-yet";

export async function generateStaticParams() {
  const result = await listMandirs();
  const slugs = result.state === "ok" ? result.data.map((m) => m.slug) : [];
  return (slugs.length ? slugs : [NO_MANDIRS]).map((slug) => ({ slug }));
}

export default async function RequestPage({
  params,
}: PageProps<"/mandirs/[slug]/request">) {
  const { slug } = await params;
  const t = pageT();
  const result = await getMandir(slug);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what={t("load.mandirPage")} />;
  }
  const mandir = result.data;
  const offered = mandir?.request_types ?? [];
  if (!mandir || mandir.status !== "claimed" || offered.length === 0) {
    notFound();
  }
  return (
    <>
      <Link
        href={localePath(`/mandirs/${mandir.slug}`)}
        className="text-peacock inline-flex min-h-11 items-center self-start font-semibold"
      >
        ← {mandir.name}
      </Link>
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          {t("request.title", { name: mandir.name })}
        </h1>
        <p className="text-muted text-lg">{t("request.intro")}</p>
      </div>

      <Suspense>
        <RequestMessage />
      </Suspense>

      <Card>
        <form action={sendRequest} className="flex flex-col gap-5">
          <input type="hidden" name="slug" value={mandir.slug} />
          <input type="hidden" name="lang" value={pageLocale()} />
          <label className="flex flex-col gap-2">
            <span className="font-semibold">{t("request.what")}</span>
            <select
              name="what"
              required
              defaultValue={offered.length === 1 ? offered[0] : ""}
              className={inputClass}
            >
              {offered.length > 1 && <option value="" disabled />}
              {offered.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">{t("request.date")}</span>
            <input name="date" type="date" className={inputClass} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">{t("request.name")}</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              className={inputClass}
            />
          </label>
          <fieldset className="flex flex-col gap-3">
            <legend className="text-muted mb-2 text-base">
              {t("request.contactHint")}
            </legend>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">{t("request.email")}</span>
              <input
                name="email"
                type="email"
                maxLength={254}
                autoComplete="email"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">{t("request.phone")}</span>
              <input
                name="phone"
                type="tel"
                maxLength={40}
                autoComplete="tel"
                className={inputClass}
              />
            </label>
          </fieldset>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">{t("request.message")}</span>
            <textarea
              name="message"
              maxLength={600}
              rows={4}
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
          <p className="text-muted text-base">
            {t("request.privacy")}{" "}
            <Link href="/privacy" className="text-peacock underline">
              {t("page.privacyNotice")}
            </Link>
          </p>
          <button type="submit" className={buttonClass}>
            {t("request.send")}
          </button>
        </form>
      </Card>
    </>
  );
}
