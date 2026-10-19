"use client";

import { useState, useSyncExternalStore } from "react";
import { sendCount } from "@/components/count-visits";
import { useOrigin } from "@/components/use-origin";
import { whatsAppLink } from "@/lib/share";

const noSubscribe = () => () => {};

// "WhatsApp" opens a chat with the message ready to send. The second
// button uses the phone's own share sheet where there is one, or copies
// the link on a computer. The label is for screen readers; the buttons say
// what they do.
export function ShareButtons({
  text,
  path,
  label = "Share",
  copy = true,
}: {
  text: string;
  path: string;
  label?: string;
  // Lists of events leave out "Copy link" to keep each card short; the
  // event's own page has it.
  copy?: boolean;
}) {
  const origin = useOrigin();
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [copied, setCopied] = useState(false);
  const url = `${origin}${path}`;

  async function shareOrCopy() {
    sendCount("share", path);
    if (canShare) {
      try {
        await navigator.share({ text, url });
      } catch {
        // Closing the share sheet isn't an error worth showing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div
      role="group"
      aria-label={label === "Share" ? `Share: ${text}` : label}
      className="inline-flex flex-wrap items-center gap-2 text-base font-semibold"
    >
      <a
        href={whatsAppLink(text, url)}
        target="_blank"
        rel="noopener"
        onClick={() => sendCount("share", path)}
        className="border-peacock/30 text-peacock hover:bg-peacock/10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 no-underline transition duration-200 hover:-translate-y-0.5 active:scale-95"
      >
        <WhatsAppIcon />
        WhatsApp
      </a>
      {copy && (
        <button
          type="button"
          onClick={shareOrCopy}
          className="border-peacock/30 text-peacock hover:bg-peacock/10 inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 no-underline transition duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          {canShare ? "Other apps" : "Copy link"}
        </button>
      )}
      <span aria-live="polite" className="text-leaf">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.7z" />
      <path d="M9.5 9.5c.3 1.8 1.7 3.4 3.6 4.3l1.2-1.1 1.7.8c-.2 1-1 1.6-2 1.6-3 0-5.8-2.7-5.8-5.8 0-1 .6-1.8 1.6-2l.8 1.7z" />
    </svg>
  );
}
