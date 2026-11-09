import { NextResponse, type NextRequest } from "next/server";
import { positionForSearch } from "@/lib/whats-on";

// A typed UK postcode or district ("LE4 6AR", "HA3") as a map position,
// for the mandir finder's search box. Looked up through Toran (as What's
// on does), so postcodes.io never sees the visitor, and nothing about the
// search is kept (decision 0006).
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 12);
  const found = await positionForSearch(q);
  if (found === "unavailable") {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  if (!found) return NextResponse.json({ error: "unknown" }, { status: 404 });
  return NextResponse.json(found, {
    headers: { "cache-control": "public, max-age=86400" },
  });
}
