"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Notice } from "@/components/ui";
import { EVENT_ERRORS } from "@/lib/event-form";

const ERRORS: Record<string, string> = {
  ...EVENT_ERRORS,
  link: "Please give a web address starting with http:// or https://, or leave it empty.",
  busy: "Thank you, but there are a lot of events waiting to be checked just now. Please try again in a few days.",
  failed: "Something went wrong. Please try again.",
};

// The thanks or the problem after sending in an event, read from the
// address in the browser so the page itself can stay static.
export function ReportMessage({ again }: { again: string }) {
  const query = useSearchParams();
  if (query.get("sent") === "1") {
    return (
      <Notice tone="success">
        Thank you. We&apos;ll check it with the mandir before it goes on the
        page.{" "}
        <Link href={again} className="underline">
          Tell us about another
        </Link>
      </Notice>
    );
  }
  const error = ERRORS[query.get("error") ?? ""];
  return error ? <Notice tone="error">{error}</Notice> : null;
}
