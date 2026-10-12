"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";

// A logged-in person asks to look after a mandir's page. A Toran admin
// checks with the mandir (usually by phone) before approving it.
export async function submitClaim(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const role = String(formData.get("role") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const back = (query: string) =>
    redirect(`/mandirs/${encodeURIComponent(slug)}/claim?${query}`);

  if (role.length < 2 || role.length > 80) back("error=role");
  if (message.length > 500) back("error=message");
  if (formData.get("confirm") !== "yes") back("error=confirm");

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase!
    .from("mandirs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");

  const { error } = await supabase!.from("mandir_claims").insert({
    mandir_id: mandir!.id,
    role_at_mandir: role,
    message: message || null,
  });
  if (error) back(error.code === "23505" ? "error=duplicate" : "error=failed");
  back("sent=1");
}
