import { cardSize, shareCard } from "@/lib/share-card";
import { MAHA_SHIVARATRI } from "@/lib/seasons";

export const alt = "Maha Shivaratri at mandirs across the UK";
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: MAHA_SHIVARATRI.name,
    title: `${MAHA_SHIVARATRI.name} at mandirs across the UK`,
    detail: MAHA_SHIVARATRI.cardDetail,
  });
}
