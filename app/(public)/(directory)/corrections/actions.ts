"use server";

import { redirect } from "next/navigation";
import { checkCorrection, correctionPage } from "@/lib/corrections";
import { createPublicServerClient } from "@/lib/supabase/server";

// Someone asks for something to be corrected or removed. It waits on
// /ops/attention (request_correction in the database); nothing about them
// is kept.
export async function requestCorrection(formData: FormData) {
  const page = correctionPage(formData.get("page"));
  const back: (query: string) => never = (query) =>
    redirect(`/corrections?page=${encodeURIComponent(page)}&${query}`);

  // A hidden field only automated spam fills in: pretend it worked.
  if (String(formData.get("company") ?? "") !== "") back("sent=1");

  const checked = checkCorrection({
    kind: formData.get("kind"),
    page,
    details: formData.get("details"),
  });
  if (!checked.ok) back(`error=${checked.error}`);

  const db = createPublicServerClient();
  if (!db) back("error=failed");
  const { error } = await db.rpc("request_correction", {
    kind: checked.kind,
    page: checked.page,
    details: checked.details,
  });
  if (error) back(error.code === "54000" ? "error=busy" : "error=failed");
  back("sent=1");
}
