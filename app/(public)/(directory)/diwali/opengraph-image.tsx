import { cardSize, shareCard } from "@/lib/share-card";
import { DIWALI } from "@/lib/seasons";

export const alt = "Diwali at mandirs across the UK";
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: DIWALI.name,
    title: `${DIWALI.name} at mandirs across the UK`,
    detail: DIWALI.cardDetail,
  });
}
