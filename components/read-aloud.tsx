"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { actionPillClass } from "@/components/ui";
import { useLocale, useT } from "@/components/use-t";
import { enRead } from "@/lib/i18n/client/read";
import { pickVoice, sentences } from "@/lib/read-aloud";

const SPEECH_LANGS = { en: "en-GB", gu: "gu-IN", hi: "hi-IN" } as const;

const speech = () =>
  typeof window !== "undefined" && "speechSynthesis" in window
    ? window.speechSynthesis
    : null;

// Voices arrive after the page loads in some browsers.
function subscribe(update: () => void) {
  const synth = speech();
  synth?.addEventListener("voiceschanged", update);
  return () => synth?.removeEventListener("voiceschanged", update);
}

// "Read aloud": the page's main details, spoken by the phone in the
// page's language. Shown only when the phone has a voice for it.
export function ReadAloud({ text }: { text: string }) {
  const t = useT(enRead);
  const lang = SPEECH_LANGS[useLocale()];
  const hasVoice = useSyncExternalStore(
    subscribe,
    () => !!pickVoice(speech()?.getVoices() ?? [], lang),
    () => false,
  );
  const [reading, setReading] = useState(false);

  // Stop when leaving the page.
  useEffect(() => () => speech()?.cancel(), []);

  if (!hasVoice) return null;

  function start() {
    const synth = speech();
    if (!synth) return;
    synth.cancel();
    const voice = pickVoice(synth.getVoices(), lang);
    const parts = sentences(text);
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = voice?.lang ?? lang;
      try {
        if (voice) u.voice = voice;
      } catch {
        // An unusual voice: the language above still picks one.
      }
      // A little slower than usual, to be easy to follow.
      u.rate = 0.9;
      if (i === parts.length - 1) {
        u.onend = () => setReading(false);
        u.onerror = () => setReading(false);
      }
      synth.speak(u);
    });
    setReading(true);
  }

  function stop() {
    speech()?.cancel();
    setReading(false);
  }

  return (
    <button
      type="button"
      onClick={reading ? stop : start}
      aria-pressed={reading}
      className={actionPillClass}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {reading ? (
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
        ) : (
          <>
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        )}
      </svg>
      {reading ? t("read.stop") : t("read.listen")}
    </button>
  );
}
