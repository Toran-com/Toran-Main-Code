"use client";

import { useState, useSyncExternalStore } from "react";
import { whatsAppLink } from "@/lib/share";

const noSubscribe = () => () => {};

// Before the page's JavaScript runs, links use the live site's address
// (Vercel provides it at build time); after, the address actually in use,
// so preview links share the preview.
const builtOrigin = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
  : "";

// "WhatsApp" opens a chat with the message ready to send. The second
// button uses the phone's own share sheet where there is one, or copies
// the link on a computer.
export function ShareButtons({
  text,
  path,
  label = "Share",
}: {
  text: string;
  path: string;
  label?: string;
}) {
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => builtOrigin,
  );
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [copied, setCopied] = useState(false);
  const url = `${origin}${path}`;

  async function shareOrCopy() {
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
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base font-semibold"
    >
      <span className="text-muted" aria-hidden="true">
        {label}:
      </span>
      <a
        href={whatsAppLink(text, url)}
        target="_blank"
        rel="noopener"
        className="text-peacock underline"
      >
        WhatsApp
      </a>
      <button
        type="button"
        onClick={shareOrCopy}
        className="text-peacock cursor-pointer underline"
      >
        {canShare ? "Other apps" : "Copy link"}
      </button>
      <span aria-live="polite" className="text-leaf">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
