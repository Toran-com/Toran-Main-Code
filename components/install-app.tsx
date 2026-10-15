"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };

const noSubscribe = () => () => {};

// Already opened from the home screen?
const installed = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Safari on iPhone and iPad has no install button, only the share menu.
const onIphone = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) && !installed();

// Registers the service worker (public/sw.js), and offers to install Toran
// on the home screen where the phone allows it: a button on Android and
// Chrome, the "Add to Home Screen" steps on an iPhone. Shows nothing once
// installed.
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const iphone = useSyncExternalStore(noSubscribe, onIphone, () => false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const offer = (event: Event) => {
      event.preventDefault();
      if (!installed()) setPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", offer);
    return () => window.removeEventListener("beforeinstallprompt", offer);
  }, []);

  if (prompt) {
    return (
      <p>
        <button
          type="button"
          onClick={async () => {
            await prompt.prompt();
            setPrompt(null);
          }}
          className="text-peacock cursor-pointer font-semibold underline"
        >
          Add Toran to your home screen
        </button>
      </p>
    );
  }
  if (iphone) {
    return (
      <p>
        Add Toran to your home screen: tap Share, then &ldquo;Add to Home
        Screen&rdquo;.
      </p>
    );
  }
  return null;
}
