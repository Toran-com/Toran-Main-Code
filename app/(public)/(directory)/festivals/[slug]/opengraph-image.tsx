import { getFestival } from "@/lib/directory";
import { formatDateRange } from "@/lib/format";
import { cardSize, shareCard } from "@/lib/share-card";
import { site } from "@/lib/site";

export const alt = "The festival's name and UK dates";
export const size = cardSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getFestival(slug);
  const festival = result.state === "ok" ? result.data : null;
  if (!festival) {
    return shareCard({
      kicker: "Festival dates in the UK",
      title: site.tagline,
    });
  }
  const next = festival.dates[0];
  return shareCard({
    kicker: "Festival dates in the UK",
    title: festival.name,
    detail: next ? formatDateRange(next.starts_on, next.ends_on) : undefined,
  });
}
