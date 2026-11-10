"use client";

import { useEffect } from "react";

// Tells the page's styles how the visitor is scrolling, so the header can
// respond (app/globals.css, "The header as you scroll"): data-scrolled on
// <html> once the page has moved, data-scroll="down" or "up" for the way
// it's going, and --header-h, the header's height, for anything that
// sticks beneath it. Nothing is re-rendered: one passive listener, at
// most one update a frame.
export function ScrollChrome() {
  useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>(".site-header");
    const measure = () => {
      if (header) {
        root.style.setProperty("--header-h", `${header.offsetHeight}px`);
      }
    };
    // Where the scroll last changed direction: a few pixels of wobble (a
    // thumb resting on the screen) never flips it.
    let anchor = window.scrollY;
    let queued = false;
    const update = () => {
      queued = false;
      const y = Math.max(0, window.scrollY);
      root.toggleAttribute("data-scrolled", y > 8);
      if (Math.abs(y - anchor) > 12) {
        // Near the top the header always shows.
        const way = y > anchor && y > 160 ? "down" : "up";
        if (root.dataset.scroll !== way) root.dataset.scroll = way;
        anchor = y;
      }
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      root.removeAttribute("data-scrolled");
      delete root.dataset.scroll;
    };
  }, []);
  return null;
}
