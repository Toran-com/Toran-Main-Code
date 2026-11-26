"use server";

import { redirect } from "next/navigation";
import { requireToranAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";
import { createSessionClient } from "@/lib/supabase/session";
import { previewEmail } from "./preview";

// "Send this to me": a mandir's weekly email, to the Toran admin's own
// address, to see it as committees will.
export async function sendPreviewToMe(formData: FormData) {
  const user = await requireToranAdmin("/ops/committee-email");
  const slug = String(formData.get("mandir") ?? "");
  const db = await createSessionClient();
  const { data: mandir } = db
    ? await db
        .from("mandirs")
        .select("id, slug, name, town, calendar, postcode, website, phone")
        .eq("slug", slug)
        .maybeSingle()
    : { data: null };
  let sent = false;
  if (db && mandir && user.email) {
    const { email } = await previewEmail(db, mandir);
    sent = await sendEmail(user.email, {
      ...email,
      subject: `[Test] ${email.subject}`,
    });
  }
  redirect(
    `/ops/committee-email?mandir=${encodeURIComponent(slug)}&sent=${sent ? "1" : "0"}`,
  );
}
