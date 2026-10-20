"use server";

import { redirect } from "next/navigation";
import { requireToranAdmin } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/session";

// A correction or removal request has been dealt with: it leaves the list,
// and the nightly job deletes it 90 days later.
export async function markRequestDone(formData: FormData) {
  await requireToranAdmin("/ops/attention");
  const id = Number(formData.get("id"));
  const supabase = await createSessionClient();
  if (!supabase || !Number.isInteger(id) || id < 1) {
    redirect("/ops/attention#requests");
  }
  await supabase
    .from("site_requests")
    .update({ done_at: new Date().toISOString() })
    .eq("id", id)
    .is("done_at", null);
  redirect("/ops/attention#requests");
}
