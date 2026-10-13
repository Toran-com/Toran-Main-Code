"use client";

import { useState } from "react";

// Copies a block of text (for pasting into an email or WhatsApp).
export function CopyText({
  text,
  label = "Copy text",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this text:", text);
    }
  }
  return (
    <div className="flex items-center gap-3 text-base font-semibold">
      <button
        type="button"
        onClick={copy}
        className="text-peacock cursor-pointer underline"
      >
        {label}
      </button>
      <span aria-live="polite" className="text-leaf">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
