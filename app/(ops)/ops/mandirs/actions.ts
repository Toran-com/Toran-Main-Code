"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { lookupPostcode, type Position } from "@/lib/geo";
import { parseMandirDetails, slugFor } from "@/lib/mandir-form";
import { createSessionClient } from "@/lib/supabase/session";

// Changes Toran admins make to the directory. The database only allows
// them for a Toran admin with the second factor; these check the form,
// look up map positions and refresh the public pages.

async function positionFor(postcode: string | null) {
  if (!postcode) return { latitude: null, longitude: null };
  try {
    const found: Position | null = await lookupPostcode(postcode);
    return found ?? { latitude: null, longitude: null };
  } catch {
    // postcodes.io is down: save anyway; "Fill in map positions" catches up.
    return { latitude: null, longitude: null };
  }
}

export async function createMandir(formData: FormData) {
  const parsed = parseMandirDetails(formData);
  if (!parsed.ok) redirect(`/ops/mandirs/new?error=${parsed.error}`);
  const values = parsed.values;
  const supabase = await createSessionClient();
  if (!supabase) redirect("/ops/mandirs/new?error=failed");

  const base = slugFor(values.name, values.town);
  const { data: taken } = await supabase
    .from("mandirs")
    .select("slug")
    .like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((t) => t.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;

  const { error } = await supabase.from("mandirs").insert({
    ...values,
    ...(await positionFor(values.postcode)),
    slug,
  });
  if (error) redirect("/ops/mandirs/new?error=failed");
  updateTag("mandirs");
  redirect(`/ops/mandirs/${slug}?saved=added`);
}

export async function updateMandir(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/ops/mandirs/${encodeURIComponent(slug)}?${query}`);
  const parsed = parseMandirDetails(formData);
  if (!parsed.ok) back(`error=${parsed.error}`);
  const values = parsed.values;
  const status = String(formData.get("status") ?? "");
  if (!["listed", "claimed", "hidden"].includes(status)) back("error=failed");

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: before } = await supabase
    .from("mandirs")
    .select("postcode, latitude")
    .eq("slug", slug)
    .maybeSingle();
  if (!before) back("error=failed");
  const moved = before.postcode !== values.postcode || before.latitude === null;

  const { error } = await supabase
    .from("mandirs")
    .update({
      ...values,
      status: status as "listed" | "claimed" | "hidden",
      ...(moved ? await positionFor(values.postcode) : {}),
    })
    .eq("slug", slug);
  if (error) back("error=failed");
  updateTag(`mandir:${slug}`);
  updateTag("mandirs");
  back("saved=1");
}

export async function removeMandirAdmin(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const mandirId = String(formData.get("mandir") ?? "");
  const member = String(formData.get("member") ?? "");
  const supabase = await createSessionClient();
  const back: (query: string) => never = (query) =>
    redirect(`/ops/mandirs/${encodeURIComponent(slug)}?${query}`);
  if (!supabase) back("error=failed");
  const { error } = await supabase.rpc("remove_mandir_admin", {
    target: mandirId,
    member,
  });
  if (error) back("error=failed");
  updateTag(`mandir:${slug}`);
  updateTag("mandirs");
  back("saved=removed");
}
