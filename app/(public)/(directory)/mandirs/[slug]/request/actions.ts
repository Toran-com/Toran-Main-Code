"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMandir } from "@/lib/directory";
import { TRANSLATED_LOCALES } from "@/lib/i18n/paths";
import { londonDate } from "@/lib/london";
import { sendEmail } from "@/lib/mailer";
import { checkRequest, requestEmail } from "@/lib/mandir-request";
import { senderAddress, sendLimiter, spamCheck } from "@/lib/spam";
import { createRobotClient } from "@/lib/supabase/robot";

const longDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

// A family asks a committee about a puja, a ceremony or the hall
// (decision 0025). It's emailed to the committee members, with the
// family's email as the reply address; Toran keeps no copy.
export async function sendRequest(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const lang = TRANSLATED_LOCALES.find((l) => l === formData.get("lang"));
  const base = lang ? `/${lang}/mandirs` : "/mandirs";
  const back: (query: string) => never = (query) =>
    redirect(`${base}/${encodeURIComponent(slug)}/request?${query}`);

  // A hidden field only automated spam fills in: pretend it worked.
  if (String(formData.get("company") ?? "") !== "") back("sent=1");
  if (!sendLimiter.allow("request", senderAddress(await headers())))
    back("error=slow");

  const result = await getMandir(slug);
  const mandir = result.state === "ok" ? result.data : null;
  if (!mandir || mandir.status !== "claimed") back("error=failed");
  const checked = checkRequest(
    formData,
    mandir.request_types ?? [],
    londonDate(),
  );
  if (!checked.ok) back(`error=${checked.error}`);
  const { request } = checked;
  const spam = spamCheck([request.message]);
  if (spam === "junk") back("sent=1");
  if (spam === "links") back("error=failed");

  const robot = createRobotClient();
  if (!robot) back("error=failed");
  const { data } = await robot.rpc("request_recipients", { target_slug: slug });
  const to = (data ?? []).map((r) => r.email);
  if (to.length === 0) back("error=failed");
  const email = requestEmail(
    mandir,
    request,
    request.date ? longDate(request.date) : null,
  );
  const sent = await Promise.all(
    to.map((address) => sendEmail(address, email)),
  );
  back(sent.some(Boolean) ? "sent=1" : "error=failed");
}
