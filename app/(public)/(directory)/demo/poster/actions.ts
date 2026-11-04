"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import {
  type DemoReading,
  demoPoster,
  readDemoPoster,
} from "@/lib/poster-demo";

// Each sample poster is read at most once a day; everyone pressing the
// button that day sees the same reading. A failure is kept for minutes.
async function cachedReading(id: string): Promise<DemoReading> {
  "use cache";
  const reading = await readDemoPoster(id, (poster) =>
    readFile(
      path.join(process.cwd(), "public", "demo-posters", `${poster.id}.jpg`),
    ),
  );
  if (reading.ok) cacheLife("days");
  else cacheLife("minutes");
  return reading;
}

export async function readSamplePoster(id: string): Promise<DemoReading> {
  if (typeof id !== "string" || !demoPoster(id)) {
    return { ok: false, error: "unknown" };
  }
  return cachedReading(id);
}
