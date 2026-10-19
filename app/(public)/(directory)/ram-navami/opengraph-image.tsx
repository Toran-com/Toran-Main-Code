import { cardSize, shareCard } from "@/lib/share-card";
import { RAM_NAVAMI } from "@/lib/seasons";

export const alt = "Ram Navami at mandirs across the UK";
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: RAM_NAVAMI.name,
    title: `${RAM_NAVAMI.name} at mandirs across the UK`,
    detail: RAM_NAVAMI.cardDetail,
  });
}
