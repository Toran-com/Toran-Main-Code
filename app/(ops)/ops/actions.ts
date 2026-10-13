"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { lookupPostcodes, normalisePostcode } from "@/lib/geo";
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

// Approve or reject a mandir claim. The database only lets a Toran admin
// with the second factor do this; approving makes them a mandir admin.
export async function decideClaim(formData: FormData) {
  const claim = String(formData.get("claim") ?? "");
  const approve = formData.get("decision") === "approve";
  const supabase = await createSessionClient();
  if (!supabase) redirect("/ops?error=claim");

  const { data: row } = await supabase
    .from("mandir_claims")
    .select("mandir:mandirs (slug)")
    .eq("id", claim)
    .maybeSingle();
  const { error } = await supabase.rpc("decide_mandir_claim", {
    claim,
    approve,
  });
  if (error) redirect("/ops?error=claim");
  if (approve && row?.mandir) {
    // The public page shows "Run by the mandir's committee" once claimed.
    updateTag(`mandir:${row.mandir.slug}`);
    updateTag("mandirs");
  }
  redirect(`/ops?decided=${approve ? "approved" : "rejected"}`);
}

// Looks up map positions for every mandir that has a postcode but no
// position yet, so "near you" and distances work. Safe to run again.
export async function fillMapPositions() {
  const supabase = await createSessionClient();
  if (!supabase) redirect("/ops?error=positions");

  const { data: missing, error } = await supabase
    .from("mandirs")
    .select("id, postcode")
    .not("postcode", "is", null)
    .is("latitude", null);
  if (error) redirect("/ops?error=positions");

  let found: Awaited<ReturnType<typeof lookupPostcodes>>;
  try {
    found = await lookupPostcodes(missing.map((m) => m.postcode!));
  } catch {
    redirect("/ops?error=postcodes");
  }

  let updated = 0;
  let unknown = 0;
  for (const m of missing) {
    const position = found.get(normalisePostcode(m.postcode!) ?? "");
    if (!position) {
      unknown++;
      continue;
    }
    const { error: updateError } = await supabase
      .from("mandirs")
      .update(position)
      .eq("id", m.id);
    if (updateError) unknown++;
    else updated++;
  }
  updateTag("mandirs");
  redirect(`/ops?positions=${updated}&unknown=${unknown}`);
}
