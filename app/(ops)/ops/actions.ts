"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";

export type EnrolState =
  | { step: "start"; error?: string }
  | {
      step: "scan";
      factorId: string;
      qr: string;
      secret: string;
      error?: string;
    };

// Step 1 of setting up an authenticator app: create the factor and show the
// QR code. Step 2 (confirmEnrolment) checks a code from the app.
export async function startEnrolment(): Promise<EnrolState> {
  const supabase = await createSessionClient();
  if (!supabase) return { step: "start", error: "Login isn't switched on." };

  // Clear any half-finished set-up so it can be started again.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified")
      await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error || !data)
    return { step: "start", error: "Couldn't start set-up. Please try again." };
  return {
    step: "scan",
    factorId: data.id,
    qr: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function confirmEnrolment(
  previous: EnrolState,
  formData: FormData,
): Promise<EnrolState> {
  if (previous.step !== "scan") return previous;
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const supabase = await createSessionClient();
  if (!supabase) return { ...previous, error: "Login isn't switched on." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: previous.factorId,
    code,
  });
  if (error)
    return {
      ...previous,
      error: "That code didn't match. Try the newest code.",
    };
  redirect("/ops");
}

// Returning admins: check a code from their app to unlock the admin area.
export async function verifySecondFactor(
  _previous: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const supabase = await createSessionClient();
  if (!supabase) return { error: "Login isn't switched on." };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) return { error: "No authenticator app is set up." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });
  if (error) return { error: "That code didn't match. Try the newest code." };
  redirect("/ops");
}
