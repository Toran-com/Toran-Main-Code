import { cardSize, shareCard } from "@/lib/share-card";
import { HOLI } from "@/lib/seasons";

export const alt = "Holi at mandirs across the UK";
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: HOLI.name,
    title: `${HOLI.name} at mandirs across the UK`,
    detail: HOLI.cardDetail,
  });
}
