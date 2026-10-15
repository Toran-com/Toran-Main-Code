import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabaseEnv } from "@/lib/env";

// Keeps the login session fresh: when someone with a Supabase session cookie
// loads a page, refresh their token if it has expired. Visitors without a
// session pass straight through. Access control lives in the pages and the
// database, not here.
export async function proxy(request: NextRequest) {
  const hasSession = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-"));
  if (!hasSession) return NextResponse.next();

  let env;
  try {
    env = readSupabaseEnv();
  } catch {
    return NextResponse.next();
  }
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
