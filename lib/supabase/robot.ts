import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { readSupabaseEnv } from "@/lib/env";

// A Supabase client for the nightly job only (decision 0016). It uses the
// project's secret key, which passes row level security, so it is only
// ever made on the server, inside /api/cron/nightly. Null until both the
// database and SUPABASE_SECRET_KEY are set.
export function createRobotClient(): SupabaseClient<Database> | null {
  const env = readSupabaseEnv();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!env || !key) return null;
  return createClient<Database>(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
