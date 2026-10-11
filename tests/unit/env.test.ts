import { describe, expect, it } from "vitest";
import { EnvError, readSupabaseEnv } from "@/lib/env";

const url = "https://abcdefgh.supabase.co";
const key = "sb_publishable_example";

describe("readSupabaseEnv", () => {
  it("returns null when nothing is set", () => {
    expect(readSupabaseEnv({})).toBeNull();
    expect(
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: " ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      }),
    ).toBeNull();
  });

  it("returns the values, trimmed, with any path removed from the URL", () => {
    expect(
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: ` ${url}/ `,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ` ${key} `,
      }),
    ).toEqual({ url, key });
  });

  it("refuses only one of the two values", () => {
    expect(() => readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: url })).toThrow(
      EnvError,
    );
    expect(() =>
      readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }),
    ).toThrow(EnvError);
  });

  it("refuses a malformed or insecure address", () => {
    expect(() =>
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not a url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toThrow(/valid web address/);
    expect(() =>
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://abcdefgh.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toThrow(/https/);
  });

  it("allows plain http for a local database", () => {
    expect(
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toEqual({ url: "http://127.0.0.1:54321", key });
  });
});
