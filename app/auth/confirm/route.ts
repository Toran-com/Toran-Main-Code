import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/redirect";
import { createSessionClient } from "@/lib/supabase/session";

// Where the emailed login link lands. Swaps the one-time code for a session
// cookie, then sends the person on to where they were going.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const failed = NextResponse.redirect(
    new URL(`/login?error=link&next=${encodeURIComponent(next)}`, url),
  );

  const supabase = await createSessionClient();
  if (!supabase) return failed;

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type }))
      .error;
  }
  return ok ? NextResponse.redirect(new URL(next, url)) : failed;
}
