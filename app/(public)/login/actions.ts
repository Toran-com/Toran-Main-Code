"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/origin";
import { looksLikeEmail, safeNextPath } from "@/lib/redirect";
import { createSessionClient } from "@/lib/supabase/session";

// Logging in by email: no passwords. The email has a link and a
// code (supabase/templates/login.html); either logs in, for 24 hours.

// The address the last email went to, on this device only, so the code
// can be typed in on the page that asked for it. Kept as long as the code
// works.
const SENT_TO = "toran-login-email";
const DAY = 24 * 60 * 60;

// Emails a login link and code. Works the same whether or not the address
// already has an account, so the page never reveals who has signed up; a
// new address gets an account when the link or code is used. Sent from
// "Log in" or "Create an account" (/join), and goes back to the page it
// came from.
export async function requestLoginLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const page = formData.get("from") === "join" ? "/join" : "/login";
  const back = (query: string) =>
    redirect(`${page}?${query}&next=${encodeURIComponent(next)}`);

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

  (await cookies()).set(SENT_TO, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAY,
  });
  back("sent=1");
}

// The code from the email (6 to 10 digits, as the project is set up),
// typed in on the page that asked for it.
export async function logInWithCode(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const page = formData.get("from") === "join" ? "/join" : "/login";
  const back = (query: string) =>
    redirect(`${page}?${query}&next=${encodeURIComponent(next)}`);
  const code = String(formData.get("code") ?? "").replace(/\s+/g, "");
  const jar = await cookies();
  const email = jar.get(SENT_TO)?.value ?? "";

  // Without the address (another device, or a day later), start again.
  if (!looksLikeEmail(email)) back("error=code-expired");
  if (!/^\d{6,10}$/.test(code)) back("sent=1&error=code");

  const supabase = await createSessionClient();
  if (!supabase) back("error=unavailable");
  const { error } = await supabase!.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  if (error) back("sent=1&error=code");

  jar.delete(SENT_TO);
  redirect(next);
}

const LINK_TYPES: readonly EmailOtpType[] = [
  "email",
  "magiclink",
  "signup",
  "invite",
];

// The link in the email leads to a page with a "Log in" button
// (/login/confirm), which sends this. The link itself logs nobody in:
// email programs and their virus checkers often open links before the
// person does, and would use it up.
export async function confirmLogin(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const failed = () =>
    redirect(`/login?error=link&next=${encodeURIComponent(next)}`);
  if (!tokenHash || !LINK_TYPES.includes(type)) failed();

  const supabase = await createSessionClient();
  if (!supabase) failed();
  const { error } = await supabase!.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error) {
    // Pressed twice (a double tap, or a press while the page was still
    // loading): the first press used the link and logged them in, so the
    // second finds it used. They're in; carry on rather than say the
    // link didn't work.
    const {
      data: { user },
    } = await supabase!.auth.getUser();
    if (!user) failed();
  }

  (await cookies()).delete(SENT_TO);
  redirect(next);
}
