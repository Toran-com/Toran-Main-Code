import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseEnv } from "@/lib/env";

// A Supabase client that acts as whoever is signed in, using the session
// cookie. For server components, server actions and route handlers.
// Returns null when the database is not connected yet.
export async function createSessionClient() {
  const env = readSupabaseEnv();
  if (!env) return null;
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // Server components can't set cookies; proxy.ts refreshes them.
        }
      },
    },
  });
}
