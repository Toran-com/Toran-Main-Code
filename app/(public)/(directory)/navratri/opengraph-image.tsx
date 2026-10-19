import { cardSize, shareCard } from "@/lib/share-card";
import { NAVRATRI } from "@/lib/seasons";

export const alt = "Navratri at mandirs across the UK";
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: NAVRATRI.name,
    title: `${NAVRATRI.name} at mandirs across the UK`,
    detail: NAVRATRI.cardDetail,
  });
}
