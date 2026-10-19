"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Notice } from "@/components/ui";
import { useT } from "@/components/use-t";
import { EVENT_ERRORS } from "@/lib/event-form";
import type { ClientKey } from "@/lib/i18n/client-messages";

const ERRORS = [
  ...Object.keys(EVENT_ERRORS),
  "link",
  "busy",
  "failed",
] as const;

// The thanks or the problem after sending in an event, read from the
// address in the browser so the page itself can stay static.
export function ReportMessage({ again }: { again: string }) {
  const t = useT();
  const query = useSearchParams();
  if (query.get("sent") === "1") {
    return (
      <Notice tone="success">
        {t("report.thanks")}{" "}
        <Link href={again} className="underline">
          {t("report.another")}
        </Link>
      </Notice>
    );
  }
  const code = query.get("error") ?? "";
  return (ERRORS as readonly string[]).includes(code) ? (
    <Notice tone="error">{t(`report.error.${code}` as ClientKey)}</Notice>
  ) : null;
}
