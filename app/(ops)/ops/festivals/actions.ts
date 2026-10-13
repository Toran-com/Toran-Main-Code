"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";

// Marks a festival date as checked (or not) against a published panchang,
// recording where it was checked.
export async function setFestivalDateChecked(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const verified = formData.get("verified") === "yes";
  const source = String(formData.get("source") ?? "").trim();
  if (verified && (source.length < 3 || source.length > 300)) {
    redirect("/ops/festivals?error=source");
  }
  const supabase = await createSessionClient();
  if (!supabase) redirect("/ops/festivals?error=failed");
  const { error } = await supabase
    .from("festival_dates")
    .update(verified ? { verified, source } : { verified })
    .eq("id", id);
  if (error) redirect("/ops/festivals?error=failed");
  updateTag("festivals");
  redirect(`/ops/festivals?saved=${verified ? "checked" : "unchecked"}`);
}
