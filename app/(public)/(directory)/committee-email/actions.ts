"use server";

import { redirect } from "next/navigation";
import { checkStopCode, emailKind } from "@/lib/committee-email";
import { createRobotClient } from "@/lib/supabase/robot";

// Stopping (or restarting) a committee email (the monthly one, or the seva
// emails) from its signed link (lib/committee-monthly-send.ts). Only the
// person the link was made for, for that mandir and that email: the code
// proves it.
export async function setCommitteeEmail(formData: FormData) {
  const u = formData.get("u");
  const m = formData.get("m");
  const c = formData.get("c");
  const kind = emailKind(formData.get("k"));
  const wanted = formData.get("wanted") === "yes";
  if (!checkStopCode(u, m, c, undefined, kind)) {
    redirect("/committee-email/stop");
  }
  const db = createRobotClient();
  await db?.rpc(kind === "seva" ? "set_seva_email" : "set_committee_email", {
    member: u as string,
    target: m as string,
    wanted,
  });
  const query = new URLSearchParams({
    u: u as string,
    m: m as string,
    c: c as string,
    ...(kind !== "monthly" && { k: kind }),
    done: wanted ? "on" : "off",
  });
  redirect(`/committee-email/stop?${query}`);
}
