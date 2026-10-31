// A mandir's photo: stored in the public "mandir-photos" bucket as two
// JPEGs the committee's browser made from their photo, one for phones and
// one for wider screens and share previews. The page shows the one that
// fits, so a phone downloads tens of kilobytes, not megabytes.

export const PHOTO_BUCKET = "mandir-photos";
export const PHOTO_WIDTHS = [640, 1200] as const;
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];
// Each file, after resizing (the bucket refuses anything larger).
export const MAX_PHOTO_BYTES = 600 * 1024;

// The public address of one size of a stored photo.
export function photoUrl(
  path: string,
  width: PhotoWidth,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!supabaseUrl) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${PHOTO_BUCKET}/${path}-${width}.jpg`;
}

// "srcset" for a stored photo: both sizes, by width.
export function photoSrcSet(path: string, supabaseUrl?: string): string | null {
  const urls = PHOTO_WIDTHS.map((w) => [photoUrl(path, w, supabaseUrl), w]);
  return urls.every(([u]) => u)
    ? urls.map(([u, w]) => `${u} ${w}w`).join(", ")
    : null;
}

// Whether the bytes are a JPEG (whatever the file claims to be).
export function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

// A fresh name for each new photo, so a changed photo is never served
// from an old copy.
export function newPhotoName(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
