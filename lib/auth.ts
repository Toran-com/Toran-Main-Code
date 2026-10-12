import { cookies } from "next/headers";
import { connection } from "next/server";
import { createSessionClient } from "@/lib/supabase/session";

export type CurrentUser = {
  id: string;
  email: string | null;
  // aal2 = signed in with a second factor in this session.
  aal: "aal1" | "aal2";
  hasSecondFactor: boolean;
  isToranAdmin: boolean;
};

// The signed-in person, or null. Reads the session cookie, so call it from
// inside a <Suspense> boundary. Checks the token with Supabase rather than
// trusting the cookie.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Always a per-request read, even before the database is connected, so
  // pages using this are never saved as static pages. connection() also
  // keeps it out of background prefetches, where Supabase's clock reads
  // aren't allowed.
  await cookies();
  await connection();
  const supabase = await createSessionClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: level }, { data: adminRow }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase
      .from("toran_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    aal: level?.currentLevel === "aal2" ? "aal2" : "aal1",
    hasSecondFactor: (user.factors ?? []).some(
      (f) => f.factor_type === "totp" && f.status === "verified",
    ),
    isToranAdmin: Boolean(adminRow),
  };
}
