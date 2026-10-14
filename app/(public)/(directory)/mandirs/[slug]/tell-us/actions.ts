"use server";

import { redirect } from "next/navigation";
import { checkEvent, eventInputFrom } from "@/lib/event-form";
import { checkLink } from "@/lib/posters";
import { createPublicServerClient } from "@/lib/supabase/server";

// A visitor sends in an event they know about. It waits in the review
// queue (report_event in the database); nothing about them is kept.
export async function reportEvent(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/mandirs/${encodeURIComponent(slug)}/tell-us?${query}`);

  // A hidden field only automated spam fills in: pretend it worked.
  if (String(formData.get("company") ?? "") !== "") back("sent=1");

  const link = String(formData.get("link") ?? "").trim();
  if (!checkLink(link)) back("error=link");
  const input = eventInputFrom(formData);
  const checked = checkEvent(input);
  if (!checked.ok) back(`error=${checked.error}`);

  const db = createPublicServerClient();
  if (!db) back("error=failed");
  const { error } = await db.rpc("report_event", {
    mandir_slug: slug,
    proposed: {
      title: input.title,
      date: input.date,
      time: input.time,
      summary: input.summary,
      repeat: input.repeat,
      until: input.until,
      link,
    },
  });
  if (error) back(error.code === "54000" ? "error=busy" : "error=failed");
  back("sent=1");
}
