"use client";

import { useEffect } from "react";

// Small menus that open over the page (a <details data-popover>, such as
// "Add to calendar" on an event in a list, or What's on's filters) close
// when you tap or click anywhere else, or press Escape, as people expect.
// Without JavaScript they still open and close from their own button.
export function PopoverCloser() {
  useEffect(() => {
    const open = () => [
      ...document.querySelectorAll<HTMLDetailsElement>(
        "details[data-popover][open]",
      ),
    ];
    const onDown = (e: PointerEvent) => {
      for (const d of open())
        if (!d.contains(e.target as Node)) d.removeAttribute("open");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      for (const d of open()) {
        d.removeAttribute("open");
        d.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
