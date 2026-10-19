import { cardSize, shareCard } from "@/lib/share-card";
import { GANESH_CHATURTHI } from "@/lib/seasons";

export const alt = "Ganesh Chaturthi at mandirs across the UK";
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: GANESH_CHATURTHI.name,
    title: `${GANESH_CHATURTHI.name} at mandirs across the UK`,
    detail: GANESH_CHATURTHI.cardDetail,
  });
}
