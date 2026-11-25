import type { NextRequest } from "next/server";
import { drawCard, readCard } from "@/lib/digest-card";

// GET /api/digest/card?p=…&s=…: a picture in the weekly email to
// committees (lib/digest-card.tsx), drawn from the signed data in its own
// address. Anything not signed by Toran is turned away.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const data = readCard(q.get("p"), q.get("s"));
  if (!data) return new Response("Not found", { status: 404 });
  return drawCard(data);
}
