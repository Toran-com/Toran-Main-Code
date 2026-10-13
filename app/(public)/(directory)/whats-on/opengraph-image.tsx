import { cardSize, shareCard } from "@/lib/share-card";

export const alt = "What's on at mandirs near you";
export const size = cardSize;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    kicker: "What's on",
    title: "Events at mandirs near you",
    detail: "The next eight weeks, across the UK",
  });
}
