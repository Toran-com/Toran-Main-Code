import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/redirect";
import { createSessionClient } from "@/lib/supabase/session";

// Where the emailed login link lands.
//
// The email's link (supabase/templates/login.html) carries a token_hash:
// it's sent on to a page with a "Log in" button (/login/confirm), so that
// email programs and virus checkers that open links before the person does
// can't use it up. Older emails, and Supabase's own template, lead here
// with a code to swap for a session straight away.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const failed = NextResponse.redirect(
    new URL(`/login?error=link&next=${encodeURIComponent(next)}`, url),
  );

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const confirm = new URL("/login/confirm", url);
    confirm.searchParams.set("token_hash", tokenHash);
    confirm.searchParams.set("type", type);
    confirm.searchParams.set("next", next);
    return NextResponse.redirect(confirm);
  }

  const code = url.searchParams.get("code");
  if (!code) return failed;
  const supabase = await createSessionClient();
  if (!supabase) return failed;
  const ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  return ok ? NextResponse.redirect(new URL(next, url)) : failed;
}
