import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeading } from "@/components/public-shell";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
} from "@/components/ui";
import {
  CORRECTION_KINDS,
  correctionPage,
  DETAILS_MAX,
} from "@/lib/corrections";
import { pageMetadata } from "@/lib/site";
import { MAX_LINKS } from "@/lib/spam";
import { requestCorrection } from "./actions";

// Ask for something to be corrected or removed: a wrong listing, a mandir
// that would rather not be listed, someone's personal details. Linked from
// every page's footer, and from mandir and event pages with the page
// filled in.

export const metadata: Metadata = {
  ...pageMetadata(
    "Correct or remove something",
    "Tell Toran about a mistake, ask for personal details to be taken down, or ask for a mandir's page to be hidden.",
    "/corrections",
  ),
};

const ERRORS: Record<string, string> = {
  kind: "Choose what kind of change you'd like.",
  details: `Say what should change, in up to ${DETAILS_MAX} characters.`,
  links: `Please include no more than ${MAX_LINKS} web addresses.`,
  slow: "You've sent a few already. Please wait a few minutes before sending another.",
  busy: "We have a lot of requests waiting just now. Please try again tomorrow.",
  failed: "That didn't send. Please try again in a few minutes.",
};

export default function CorrectionsPage(props: PageProps<"/corrections">) {
  return (
    <>
      <PageHeading
        title="Correct or remove something"
        intro="Tell us what's wrong and we'll put it right. A mandir that would rather not be listed is hidden the same day."
      />
      <Suspense fallback={<Loading />}>
        <CorrectionForm searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function CorrectionForm({
  searchParams,
}: {
  searchParams: PageProps<"/corrections">["searchParams"];
}) {
  const query = await searchParams;
  const page = correctionPage(query.page);
  const error = ERRORS[String(query.error ?? "")];
  if (query.sent) {
    return (
      <Notice tone="success">
        <span className="flex flex-col gap-2">
          <span className="font-semibold">Thank you, we&apos;ve got it.</span>
          <span>
            We check requests every day. Removals are done the same day;
            corrections once we&apos;ve checked them with the mandir.
          </span>
          <Link href={page} className="text-peacock underline">
            Back to the page
          </Link>
        </span>
      </Notice>
    );
  }
  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      <Card>
        <form action={requestCorrection} className="flex flex-col gap-5">
          <input type="hidden" name="page" value={page} />
          {page !== "/" && (
            <p>
              About this page:{" "}
              <Link href={page} className="text-peacock break-all underline">
                {page}
              </Link>
            </p>
          )}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-semibold">What would you like?</legend>
            {CORRECTION_KINDS.map((k, i) => (
              <label key={k.value} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="kind"
                  value={k.value}
                  required
                  defaultChecked={i === 0}
                  className="accent-peacock mt-1.5 size-5 shrink-0"
                />
                <span>{k.label}</span>
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">What should change?</span>
            <span className="text-muted -mt-1 text-base">
              {page === "/"
                ? "Include the mandir's name and town, or the page's address."
                : "For example, the right time or date, or what to take down."}
            </span>
            <textarea
              name="details"
              required
              minLength={2}
              maxLength={DETAILS_MAX}
              rows={5}
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
            We don&apos;t ask who you are and don&apos;t keep anything about
            you. Please don&apos;t type anyone&apos;s name, phone number or
            email address. See our{" "}
            <Link href="/privacy" className="text-peacock underline">
              privacy notice
            </Link>
            .
          </p>
          <button type="submit" className={buttonClass}>
            Send
          </button>
        </form>
      </Card>
    </>
  );
}
