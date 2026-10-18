"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";

// Someone invited onto a mandir's committee accepts or says no. The
// database checks the invite was sent to their own email address.

export async function acceptInvite(formData: FormData) {
  const supabase = await createSessionClient();
  if (!supabase) redirect("/account?error=failed");
  const { data: slug, error } = await supabase.rpc("accept_committee_invite", {
    invite: String(formData.get("invite") ?? ""),
  });
  if (error || !slug) redirect("/account?error=invite");
  updateTag(`mandir:${slug}`);
  updateTag("mandirs");
  redirect(`/manage/${encodeURIComponent(slug)}?done=joined`);
}

export async function declineInvite(formData: FormData) {
  const supabase = await createSessionClient();
  if (!supabase) redirect("/account?error=failed");
  const { error } = await supabase.rpc("drop_committee_invite", {
    invite: String(formData.get("invite") ?? ""),
  });
  redirect(error ? "/account?error=failed" : "/account?done=declined");
}
