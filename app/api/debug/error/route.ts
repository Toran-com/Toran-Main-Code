import { connection } from "next/server";

// Throws on purpose so you can check Sentry is receiving errors. Works on
// preview links and your own computer only; the live site answers 404.
export async function GET() {
  await connection();
  if (process.env.VERCEL_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  throw new Error("Test error from /api/debug/error: Sentry is connected.");
}
