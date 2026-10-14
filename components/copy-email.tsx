"use client";

import { useState } from "react";

// Copies the digest as a formatted email, so pasting it into Gmail,
// Buttondown or Mailchimp keeps the headings and links. Where the browser
// can't copy formatting, it copies the plain text instead.
export function CopyEmail({ html, text }: { html: string; text: string }) {
  const [done, setDone] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      setDone("Copied. Paste it into your email.");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setDone("Copied as plain text (this browser can't copy formatting).");
      } catch {
        window.prompt("Copy this text:", text);
      }
    }
    setTimeout(() => setDone(""), 4000);
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-base font-semibold">
      <button
        type="button"
        onClick={copy}
        className="text-peacock cursor-pointer underline"
      >
        Copy the email
      </button>
      <span aria-live="polite" className="text-leaf">
        {done}
      </span>
    </div>
  );
}
