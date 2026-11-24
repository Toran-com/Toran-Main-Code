"use client";

import { useSearchParams } from "next/navigation";
import { Notice } from "@/components/ui";
import { useT } from "@/components/use-t";
import { enRequest } from "@/lib/i18n/client/request";

// The thanks or the problem after asking a committee about a puja or a
// booking, read from the address so the page itself stays static.
export function RequestMessage() {
  const t = useT(enRequest);
  const query = useSearchParams();
  if (query.get("sent") === "1") {
    return <Notice tone="success">{t("request.sent")}</Notice>;
  }
  const key = `request.error.${query.get("error") ?? ""}`;
  return key in enRequest ? (
    <Notice tone="error">{t(key as keyof typeof enRequest)}</Notice>
  ) : null;
}
