import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/session";

// Sign out (POST only, so a link or image can't sign someone out).
export async function POST(request: NextRequest) {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  return NextResponse.redirect(new URL("/", request.nextUrl), { status: 303 });
}
