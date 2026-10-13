import { cardSize, shareCard } from "@/lib/share-card";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: "Mandirs across the UK",
    title: site.tagline,
    detail: "Events, festival dates and seva in one place",
  });
}
