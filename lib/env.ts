// Reads the Supabase settings. They are read by exact name so Next.js can
// inline the public values into browser code when we need them there.

export type SupabaseEnv = { url: string; key: string };

type Source = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export class EnvError extends Error {}

// Returns null when neither value is set (the database is simply not
// connected yet), and throws EnvError when they are set but wrong.
export function readSupabaseEnv(
  source: Source = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): SupabaseEnv | null {
  const url = source.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!url && !key) return null;
  if (!url || !key) {
    throw new EnvError(
      "Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or neither.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new EnvError("NEXT_PUBLIC_SUPABASE_URL is not a valid web address.");
  }
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) {
    throw new EnvError("NEXT_PUBLIC_SUPABASE_URL must start with https://");
  }

  return { url: parsed.origin, key };
}
