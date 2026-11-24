"use server";

import { redirect } from "next/navigation";
import { checkStopCode } from "@/lib/committee-monthly-send";
import { createRobotClient } from "@/lib/supabase/robot";

// Stopping (or restarting) the monthly committee email from its signed
// link (lib/committee-monthly-send.ts). Only the person the link was made
// for, for that mandir: the code proves it.
export async function setCommitteeEmail(formData: FormData) {
  const u = formData.get("u");
  const m = formData.get("m");
  const c = formData.get("c");
  const wanted = formData.get("wanted") === "yes";
  if (!checkStopCode(u, m, c)) redirect("/committee-email/stop");
  const db = createRobotClient();
  await db?.rpc("set_committee_email", {
    member: u as string,
    target: m as string,
    wanted,
  });
  const query = new URLSearchParams({
    u: u as string,
    m: m as string,
    c: c as string,
    done: wanted ? "on" : "off",
  });
  redirect(`/committee-email/stop?${query}`);
}
