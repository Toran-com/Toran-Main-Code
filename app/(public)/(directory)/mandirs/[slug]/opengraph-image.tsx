import { getMandir } from "@/lib/directory";
import { cardSize, shareCard } from "@/lib/share-card";
import { site } from "@/lib/site";

export const alt = "The mandir's name and town";
export const size = cardSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getMandir(slug);
  const mandir = result.state === "ok" ? result.data : null;
  if (!mandir) {
    return shareCard({ kicker: "Mandirs across the UK", title: site.tagline });
  }
  return shareCard({
    kicker: "What's on at",
    title: mandir.name,
    detail: `${mandir.town}, ${mandir.region}`,
  });
}
