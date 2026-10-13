import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/session";

// For pages under /manage/<slug>: the signed-in person must look after the
// mandir (or be a Toran admin with the second factor). Anyone else gets
// "not found", so the page doesn't reveal it exists.
export async function requireMandirAccess(slug: string, path: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createSessionClient();
  if (!supabase) notFound();
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, slug, name, town")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) notFound();
  const { data: admin } = await supabase
    .from("mandir_admins")
    .select("mandir_id")
    .eq("mandir_id", mandir.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin && !(user.isToranAdmin && user.aal === "aal2")) notFound();
  return { supabase, mandir, user };
}
