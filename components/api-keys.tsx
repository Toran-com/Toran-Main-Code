"use client";

import { useActionState } from "react";
import type { ApiKeyState } from "@/app/(mandir)/manage/[slug]/actions";
import { CopyText } from "@/components/copy-text";
import { buttonClass, inputClass, Notice } from "@/components/ui";

// Making a key for the mandir's own website or booking system (decision
// 0032). The key appears once, to copy and give to whoever runs the
// system; Toran can't show it again.

const PROBLEMS = {
  label: "Give the key a name of 2 to 60 characters, such as “Our website”.",
  too_many:
    "This mandir already has five working keys. Stop one you no longer use first.",
  failed: "That didn't work. Try again.",
};

export function ApiKeyMaker({
  slug,
  action,
}: {
  slug: string;
  action: (state: ApiKeyState, form: FormData) => Promise<ApiKeyState>;
}) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <div className="flex flex-col gap-4">
      {state.key ? (
        <div
          role="status"
          className="border-leaf bg-leaf/10 flex flex-col gap-3 rounded-2xl border-l-4 p-4"
        >
          <p className="font-semibold">
            Your new key{state.label ? ` for “${state.label}”` : ""}
          </p>
          <p
            className="bg-surface rounded-xl p-3 font-mono text-base break-all"
            data-testid="new-api-key"
          >
            {state.key}
          </p>
          <CopyText text={state.key} label="Copy the key" />
          <p>
            Copy it now and give it to whoever runs your website or booking
            system. Toran won&apos;t show it again. Keep it like a password:
            anyone with it can put events on your page.
          </p>
        </div>
      ) : null}
      {state.error ? (
        <Notice tone="error">{PROBLEMS[state.error]}</Notice>
      ) : null}
      <form action={run} className="flex flex-col gap-4">
        <input type="hidden" name="slug" value={slug} />
        <label className="flex flex-col gap-2">
          <span className="font-semibold">What it&apos;s for</span>
          <input
            name="label"
            required
            minLength={2}
            maxLength={60}
            placeholder="e.g. Our website, Booking system"
            className={inputClass}
          />
        </label>
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? "Making the key…" : "Make a key"}
        </button>
      </form>
    </div>
  );
}
