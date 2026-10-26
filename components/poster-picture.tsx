"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, inputClass } from "@/components/ui";

// "Read a poster": a photo or PDF of a poster, sent to be read
// (readPosterPicture in app/(ops)/ops/posters/actions.ts). Phone photos are
// shrunk here first, to well under the 4 MB that can be sent, and so
// they're quicker to send on a phone's connection.

const LONGEST_SIDE = 2000;

async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    LONGEST_SIDE / Math.max(bitmap.width, bitmap.height),
  );
  if (scale === 1 && file.size < 1_500_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((done) =>
    canvas.toBlob(done, "image/jpeg", 0.85),
  );
  return blob ? new File([blob], "poster.jpg", { type: "image/jpeg" }) : file;
}

export function PosterPicture({
  action,
  mandirs,
  chosen,
  sources,
}: {
  action: (formData: FormData) => Promise<void>;
  mandirs: { slug: string; name: string; town: string }[];
  chosen: string;
  sources: { value: string; label: string }[];
}) {
  const [problem, setProblem] = useState("");
  return (
    <form
      action={async (formData) => {
        setProblem("");
        const file = formData.get("poster");
        if (file instanceof File && file.size > 0) {
          try {
            formData.set("poster", await shrink(file));
          } catch {
            setProblem(
              "That picture couldn't be opened. Try a JPEG or PNG photo, or a PDF.",
            );
            return;
          }
        }
        await action(formData);
      }}
      className="flex flex-col gap-5"
    >
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Mandir</span>
        <select
          name="mandir"
          required
          defaultValue={chosen}
          className={inputClass}
        >
          <option value="" disabled>
            Choose a mandir
          </option>
          {mandirs.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}, {m.town}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Photo or PDF of the poster</span>
        <input
          name="poster"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Where it came from</span>
        <select
          name="from"
          required
          defaultValue="whatsapp"
          className={inputClass}
        >
          {sources.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {problem && (
        <p role="alert" className="text-kumkum font-semibold">
          {problem}
        </p>
      )}
      <Send />
    </form>
  );
}

function Send() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass}>
      {pending ? "Reading the poster… (about half a minute)" : "Read it"}
    </button>
  );
}
