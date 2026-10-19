import { cardSize, shareCard } from "@/lib/share-card";
import { JANMASHTAMI } from "@/lib/seasons";

export const alt = "Janmashtami at mandirs across the UK";
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: JANMASHTAMI.name,
    title: `${JANMASHTAMI.name} at mandirs across the UK`,
    detail: JANMASHTAMI.cardDetail,
  });
}
