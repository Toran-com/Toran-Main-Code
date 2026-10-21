import { formatTimeOfDay } from "@/lib/format";
import { mandirKit, PICTURE_EVENTS } from "@/lib/season-kit";
import { seasonPoster } from "@/lib/share-card";
import { siteUrl } from "@/lib/site";

// The mandir's festival programme as a picture for WhatsApp
// (lib/season-kit.ts). Its events change, so it's kept an hour at most.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; season: string }> },
) {
  const { slug, season } = await params;
  const kit = await mandirKit(slug, season);
  if (!kit) return new Response("Not found", { status: 404 });

  const shown = kit.events.slice(0, PICTURE_EVENTS);
  const host = new URL(siteUrl()).host;
  const page = `${host}/mandirs/${slug}`;
  const picture = await seasonPoster({
    kicker: `${kit.season.period} at`,
    title: kit.mandir.name,
    detail: kit.mandir.town,
    events: shown.map((e) => ({
      date: e.next_starts_at,
      time: formatTimeOfDay(e.next_starts_at, e.all_day),
      title: e.title,
    })),
    more: kit.events.length - shown.length,
    // A very long address doesn't fit on one line; the site's does.
    address: page.length <= 60 ? page : host,
  });
  return new Response(picture.body, {
    headers: {
      "content-type": "image/png",
      "content-disposition": `inline; filename="${slug}-${kit.season.slug}.png"`,
      "cache-control": "public, max-age=600, s-maxage=3600",
    },
  });
}
