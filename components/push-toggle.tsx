"use client";

import { useEffect, useState } from "react";
import { actionPillClass } from "@/components/ui";
import { useT } from "@/components/use-t";
import { enFollow } from "@/lib/i18n/client/follow";
import { type PushState, pushState, turnOff, turnOn } from "@/lib/push-client";

// "Turn on notifications" for the mandirs followed on this phone (decision
// 0024): a notice from a mandir at once, new events once a day. Not shown
// at all until Toran's push keys are set up, or where a browser can't.
// "compact": a single line under the Follow button.
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const t = useT(enFollow);
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [justOn, setJustOn] = useState(false);
  useEffect(() => {
    let live = true;
    pushState().then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, []);

  if (state === "loading" || state === "unsupported") return null;
  // Under Follow: once on, just a tick for the one who turned it on.
  if (compact && state === "on") {
    return justOn ? (
      <p className="text-leaf-ink font-semibold" aria-live="polite">
        ✓ {t("push.on")}
      </p>
    ) : null;
  }

  const press = async (on: boolean) => {
    setBusy(true);
    setFailed(false);
    try {
      const next = on ? await turnOn() : await turnOff();
      setState(next);
      if (on && next === "off") setFailed(true);
      if (on && next === "on") setJustOn(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {!compact && <p className="font-semibold">{t("push.title")}</p>}
      {state === "on" ? (
        <>
          <p className="text-leaf-ink font-semibold">✓ {t("push.on")}</p>
          <p className="text-muted text-base">{t("push.onNote")}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => press(false)}
            className="text-muted inline-flex min-h-11 cursor-pointer items-center self-start text-base underline"
          >
            {t("push.turnOff")}
          </button>
        </>
      ) : state === "denied" ? (
        <p className="text-muted text-base">{t("push.denied")}</p>
      ) : state === "ios-install" ? (
        <p className="text-muted text-base">{t("push.ios")}</p>
      ) : (
        <>
          {!compact && <p className="text-muted">{t("push.offer")}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => press(true)}
            className={`${actionPillClass} self-start`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {compact ? t("push.offer") : t("push.turnOn")}
          </button>
        </>
      )}
      {failed && <p className="text-kumkum text-base">{t("push.failed")}</p>}
    </div>
  );
}
