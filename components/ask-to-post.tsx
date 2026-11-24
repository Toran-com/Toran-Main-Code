"use client";

import { useState, useSyncExternalStore } from "react";
import { sendCount } from "@/components/count-visits";
import { WhatsAppIcon } from "@/components/icons";
import { actionPillClass, pillButtonClass } from "@/components/ui";
import { useT } from "@/components/use-t";
import { enFollow } from "@/lib/i18n/client/follow";
import { whatsAppLink } from "@/lib/whatsapp";

// "Ask them to post on Toran", on the page of a mandir whose committee
// isn't on Toran yet or has nothing coming up. A press adds one to the
// mandir's asks, with nothing about who (decision 0022); the committee and
// Toran see the total. Then a ready-made WhatsApp message for anyone who
// knows someone on the committee. Each phone asks a mandir once: it
// remembers which it asked, on the phone only.

const KEY = "toran:asked";

function asked(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function remember(slug: string) {
  try {
    const list = asked().split(",").filter(Boolean);
    if (!list.includes(slug)) {
      localStorage.setItem(KEY, [...list, slug].slice(-50).join(","));
    }
  } catch {
    // Not remembered: they could ask again, which is fine.
  }
}

const noSubscribe = () => () => {};

export function AskToPost({
  slug,
  name,
  url,
  quiet = false,
}: {
  slug: string;
  name: string;
  // The page for committees, sent in the WhatsApp message.
  url: string;
  // In the "Are you on the committee?" box rather than a card of its own.
  quiet?: boolean;
}) {
  const t = useT(enFollow);
  const before = useSyncExternalStore(
    noSubscribe,
    () => asked().split(",").includes(slug),
    () => false,
  );
  const [now, setNow] = useState(false);
  const done = before || now;

  return (
    <div
      className={
        quiet
          ? "flex flex-col gap-3"
          : "bg-sunk flex flex-col gap-3 rounded-3xl p-6"
      }
    >
      {!quiet && <p className="font-semibold">{t("ask.title")}</p>}
      {done ? (
        <>
          <p role="status" className="text-leaf-ink font-semibold">
            ✓ {t("ask.thanks")}
          </p>
          <p className="text-muted">{t("ask.send")}</p>
          <a
            href={whatsAppLink(t("ask.message", { name }), url)}
            target="_blank"
            rel="noopener"
            className={`${pillButtonClass} self-start`}
          >
            <WhatsAppIcon />
            {t("ask.whatsapp")}
          </a>
        </>
      ) : (
        <>
          <p className="text-muted">{t("ask.body")}</p>
          <button
            type="button"
            onClick={() => {
              sendCount("ask", `/mandirs/${slug}`);
              remember(slug);
              setNow(true);
            }}
            className={`${actionPillClass} self-start`}
          >
            {t("ask.button")}
          </button>
        </>
      )}
    </div>
  );
}
