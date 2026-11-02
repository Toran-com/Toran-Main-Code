"use client";

import { useRef, useState } from "react";
import { MAX_PHOTO_BYTES, PHOTO_WIDTHS } from "@/lib/mandir-photo";

// Choose a photo of the mandir. It's made smaller here, on the phone or
// computer, before it's sent: one copy 640 pixels wide and one 1,200, as
// JPEGs. Nothing is sent until the form is.
export function PhotoPicker() {
  const files = useRef<Record<number, HTMLInputElement | null>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<"none" | "working" | "ready" | "failed">(
    "none",
  );

  async function choose(file: File | undefined) {
    setPreview(null);
    if (!file) return setState("none");
    setState("working");
    try {
      const image = await createImageBitmap(file);
      for (const width of PHOTO_WIDTHS) {
        const blob = await shrink(image, width);
        const holder = new DataTransfer();
        holder.items.add(
          new File([blob], `photo-${width}.jpg`, { type: "image/jpeg" }),
        );
        const input = files.current[width];
        if (input) input.files = holder.files;
        if (width === PHOTO_WIDTHS[0]) setPreview(URL.createObjectURL(blob));
      }
      setState("ready");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Choose a photo</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => choose(e.target.files?.[0])}
          className="text-base"
        />
      </label>
      {PHOTO_WIDTHS.map((width) => (
        <input
          key={width}
          ref={(el) => {
            files.current[width] = el;
          }}
          type="file"
          name={`photo_${width}`}
          hidden
          aria-hidden="true"
          tabIndex={-1}
        />
      ))}
      {state === "working" && <p className="text-muted">Getting it ready…</p>}
      {state === "failed" && (
        <p className="text-kumkum font-semibold">
          That photo couldn&apos;t be opened. Please try a JPEG or PNG.
        </p>
      )}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- a preview of a file on this device
        <img
          src={preview}
          alt="The photo you chose"
          className="aspect-[16/9] w-full max-w-md rounded-2xl object-cover"
        />
      )}
    </div>
  );
}

// The photo as a JPEG at most `width` pixels wide (never made bigger),
// and under the size the bucket takes.
async function shrink(image: ImageBitmap, width: number): Promise<Blob> {
  const scale = Math.min(1, width / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, "image/jpeg", quality),
    );
    if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
  }
  throw new Error("too big");
}
