import { getMandir } from "@/lib/directory";
import { MAX_PHOTO_BYTES, photoUrl } from "@/lib/mandir-photo";
import { cardSize, shareCard } from "@/lib/share-card";
import { site } from "@/lib/site";

export const alt = "The mandir's name and town";
export const size = cardSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getMandir(slug);
  const mandir = result.state === "ok" ? result.data : null;
  if (!mandir) {
    return shareCard({ kicker: "Mandirs across the UK", title: site.tagline });
  }
  return shareCard({
    kicker: "What's on at",
    title: mandir.name,
    detail: `${mandir.town}, ${mandir.region}`,
    photo: mandir.photo_path ? await photoData(mandir.photo_path) : undefined,
  });
}

// The mandir's photo, fetched here and handed over as data, so a missing
// or slow photo leaves the plain card rather than no picture at all.
async function photoData(path: string): Promise<string | undefined> {
  const url = photoUrl(path, 1200);
  if (!url) return undefined;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok || response.headers.get("content-type") !== "image/jpeg") {
      return undefined;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_PHOTO_BYTES) return undefined;
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch {
    return undefined;
  }
}
