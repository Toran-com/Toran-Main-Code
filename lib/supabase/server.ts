import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "@/lib/env";

// A Supabase client for server code that acts as the public (anon) role.
// Returns null when the database is not connected yet. Logged-in clients
// arrive with login in pull request 4.
export function createPublicServerClient(): SupabaseClient | null {
  const env = readSupabaseEnv();
  if (!env) return null;
  return createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
