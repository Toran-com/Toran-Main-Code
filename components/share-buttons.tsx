"use client";

import { useState, useSyncExternalStore } from "react";
import { sendCount } from "@/components/count-visits";
import { WhatsAppIcon } from "@/components/icons";
import { useOrigin } from "@/components/use-origin";
import { actionPillClass } from "@/components/ui";
import { useT } from "@/components/use-t";
import { enShare } from "@/lib/i18n/client/share";
import { whatsAppLink } from "@/lib/whatsapp";

const noSubscribe = () => () => {};

// "WhatsApp" opens a chat with the message ready to send. The second
// button uses the phone's own share sheet where there is one, or copies
// the link on a computer. The label is for screen readers; the buttons say
// what they do.
export function ShareButtons({
  text,
  path,
  label,
  copy = true,
}: {
  text: string;
  path: string;
  label?: string;
  // Lists of events leave out "Copy link" to keep each card short; the
  // event's own page has it.
  copy?: boolean;
}) {
  const t = useT(enShare);
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
      window.prompt(t("share.copyPrompt"), url);
    }
  }

  return (
    <div
      role="group"
      aria-label={label ?? t("share.label", { text })}
      className="inline-flex flex-wrap items-center gap-2 text-base font-semibold"
    >
      <a
        href={whatsAppLink(text, url)}
        target="_blank"
        rel="noopener"
        onClick={() => sendCount("share", path)}
        className={actionPillClass}
      >
        <WhatsAppIcon />
        WhatsApp
      </a>
      {copy && (
        <button type="button" onClick={shareOrCopy} className={actionPillClass}>
          {canShare ? t("share.otherApps") : t("share.copyLink")}
        </button>
      )}
      <span aria-live="polite" className="text-leaf">
        {copied ? t("share.copied") : ""}
      </span>
    </div>
  );
}
