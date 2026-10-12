import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { readSupabaseEnv } from "@/lib/env";

// A Supabase client for server code that acts as the public (anon) role.
// Returns null when the database is not connected yet.
export function createPublicServerClient(): SupabaseClient<Database> | null {
  const env = readSupabaseEnv();
  if (!env) return null;
  return createClient<Database>(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
