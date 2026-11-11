"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";

// Someone invited onto a mandir's committee accepts or says no. The
// database checks the invite was sent to their own email address.

export async function acceptInvite(formData: FormData) {
  if (formData.get("consent") !== "yes") redirect("/account?error=consent");
  const supabase = await createSessionClient();
  if (!supabase) redirect("/account?error=failed");
  const { data: slug, error } = await supabase.rpc("accept_committee_invite", {
    invite: String(formData.get("invite") ?? ""),
    consent: formData.get("consent") === "yes",
  });
  if (error?.message === "consent_required") redirect("/account?error=consent");
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

// A family closes its account (decision 0020): the login and its saved
// lists are deleted. The database refuses for anyone who runs or is
// asking to run a mandir, or runs Toran; they ask Toran instead.
export async function closeFamilyAccount(formData: FormData) {
  if (formData.get("sure") !== "yes") redirect("/account?error=sure");
  const supabase = await createSessionClient();
  if (!supabase) redirect("/account?error=failed");
  const { data: done, error } = await supabase.rpc("delete_my_family_account");
  if (error || !done) redirect("/account?error=close");
  // The login no longer exists; clear this browser's session too.
  await supabase.auth.signOut();
  redirect("/login?closed=1");
}

// Deletes what a family's account has saved, keeping the account.
export async function forgetFamilySaved() {
  const supabase = await createSessionClient();
  if (!supabase) redirect("/account?error=failed");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount");
  const { error } = await supabase
    .from("family_saved")
    .delete()
    .eq("user_id", user.id);
  redirect(error ? "/account?error=failed" : "/account?done=forgotten");
}
