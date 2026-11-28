import type { NextRequest } from "next/server";
import { putApiEvent, removeApiEvent } from "@/lib/events-api";
import { siteUrl } from "@/lib/site";
import { bodyOf, json, refresh, withKey } from "../respond";

// PUT /api/v1/events/<your id>: puts one event on the mandir's page, or
// changes it. DELETE takes it off. Documented at /for-mandirs/events-api
// (decision 0032).
export async function PUT(
  request: NextRequest,
  { params }: RouteContext<"/api/v1/events/[id]">,
) {
  const { id } = await params;
  return withKey(request, async (db, mandir) => {
    const body = await bodyOf(request);
    const result = await putApiEvent(db, mandir, id, body, {
      siteUrl: siteUrl(),
    });
    if (result.status < 300) refresh(mandir);
    return json(result.body, result.status);
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext<"/api/v1/events/[id]">,
) {
  const { id } = await params;
  return withKey(request, async (db, mandir) => {
    const result = await removeApiEvent(db, mandir, id);
    if (result.status === 204) {
      refresh(mandir);
      return new Response(null, {
        status: 204,
        headers: { "cache-control": "no-store" },
      });
    }
    return json(result.body, result.status);
  });
}
