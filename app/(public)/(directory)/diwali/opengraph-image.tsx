import { cardSize, shareCard } from "@/lib/share-card";

export const alt = "Diwali at mandirs across the UK";
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: "Diwali",
    title: "Diwali at mandirs across the UK",
    detail: "Lakshmi puja, Annakut, fireworks and more, near you",
  });
}
