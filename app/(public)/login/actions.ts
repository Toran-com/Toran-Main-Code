"use server";

import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/origin";
import { looksLikeEmail, safeNextPath } from "@/lib/redirect";
import { createSessionClient } from "@/lib/supabase/session";

// Emails a one-time login link. Works the same whether or not the address
// already has an account, so the page never reveals who has signed up.
export async function requestLoginLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const back = (query: string) =>
    redirect(`/login?${query}&next=${encodeURIComponent(next)}`);

  if (!looksLikeEmail(email)) back("error=email");

  const supabase = await createSessionClient();
  if (!supabase) back("error=unavailable");

  const origin = await requestOrigin();
  const { error } = await supabase!.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });
  if (error) back(error.status === 429 ? "error=slow-down" : "error=send");

  back("sent=1");
}
