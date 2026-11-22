"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { alertAdmins, claimAlertEmail } from "@/lib/admin-alerts";
import { siteUrl } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";

// A logged-in person asks to look after a mandir's page. A Toran admin
// checks with the mandir (usually by phone) before approving it, and is
// emailed that one is waiting (lib/admin-alerts.ts).
export async function submitClaim(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const role = String(formData.get("role") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const back = (query: string) =>
    redirect(`/mandirs/${encodeURIComponent(slug)}/claim?${query}`);

  if (role.length < 2 || role.length > 80) back("error=role");
  if (message.length > 500) back("error=message");
  if (formData.get("confirm") !== "yes") back("error=confirm");
  // Explicit consent, separate from the confirmation (DPIA section 5):
  // being on a committee can show someone's religion.
  if (formData.get("consent") !== "yes") back("error=consent");

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase!
    .from("mandirs")
    .select("id, name, town")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");

  const { error } = await supabase!.from("mandir_claims").insert({
    mandir_id: mandir!.id,
    role_at_mandir: role,
    message: message || null,
    // The database stamps its own time.
    consented_at: new Date().toISOString(),
  });
  if (error) back(error.code === "23505" ? "error=duplicate" : "error=failed");
  // After the page has answered, so the email never slows the person down.
  const email = claimAlertEmail(mandir!, siteUrl());
  after(() => alertAdmins(email));
  back("sent=1");
}
