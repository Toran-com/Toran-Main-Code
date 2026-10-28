"use client";

import { useEffect } from "react";

// Opens the folded card (components/fold.tsx) that the address points
// into, such as /manage/…#committee from the to-do list or after saving,
// and scrolls to it.
export function OpenFromHash() {
  useEffect(() => {
    function open() {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      const fold = target?.closest("details");
      if (!target || !fold || fold.open) return;
      fold.open = true;
      target.scrollIntoView();
    }
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
