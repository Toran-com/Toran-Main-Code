"use server";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { sendEmail } from "@/lib/mailer";
import { siteUrl } from "@/lib/site";
import { senderAddress, sendLimiter } from "@/lib/spam";
import { createPublicServerClient } from "@/lib/supabase/server";
import {
  checkSignup,
  confirmEmail,
  hashCode,
  isCode,
  leaveCode,
  newCode,
  weeklyEmailOn,
} from "@/lib/weekly-email";

// Signing up for the weekly email, confirming it from the email, and
// leaving. Only while the weekly email is switched on (lib/weekly-email.ts).

export async function signUpWeekly(formData: FormData) {
  if (!weeklyEmailOn()) notFound();
  const back: (query: string) => never = (query) =>
    redirect(`/weekly?${query}`);

  // A hidden field only automated spam fills in: pretend it worked.
  if (String(formData.get("company") ?? "") !== "") back("sent=1");
  if (!sendLimiter.allow("weekly", senderAddress(await headers()))) {
    back("error=slow");
  }
  const signup = checkSignup(
    String(formData.get("email") ?? ""),
    String(formData.get("region") ?? ""),
  );
  if (!signup.ok) back(`error=${signup.error}`);
  const leave = leaveCode(signup.email);
  const db = createPublicServerClient();
  if (!db || !leave) back("error=failed");

  const confirm = newCode();
  const { error } = await db.rpc("subscribe_digest", {
    address: signup.email,
    area: signup.region ?? "",
    confirm: hashCode(confirm),
    leave: hashCode(leave),
  });
  if (error) back(error.code === "54000" ? "error=busy" : "error=failed");
  const sent = await sendEmail(
    signup.email,
    confirmEmail(siteUrl(), confirm, signup.region),
  );
  back(sent ? "sent=1" : "error=failed");
}

export async function confirmWeekly(formData: FormData) {
  if (!weeklyEmailOn()) notFound();
  const code = formData.get("code");
  if (!isCode(code)) redirect("/weekly/confirm?error=link");
  const db = createPublicServerClient();
  const { data } = db
    ? await db.rpc("confirm_digest", { code_hash: hashCode(code) })
    : { data: false };
  redirect(data ? "/weekly/confirm?done=1" : "/weekly/confirm?error=link");
}

export async function leaveWeekly(formData: FormData) {
  const code = formData.get("code");
  if (isCode(code)) {
    const db = createPublicServerClient();
    await db?.rpc("unsubscribe_digest", { code_hash: hashCode(code) });
  }
  // The same answer whether or not it was there.
  redirect("/weekly/leave?done=1");
}
