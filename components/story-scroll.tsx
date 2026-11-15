"use client";

import { type ReactNode, useEffect, useRef } from "react";

// The scroll story on the home page (components/home-story.tsx): marks
// which step is in the middle of view, as data-active on the story, so
// components/home-story.css can show that step's screen in the phone and
// slide its words in (data-ready says this script is running).
// No React state, so scrolling never re-renders anything. Without
// JavaScript the first screen stays and every step still reads in order.
export function StoryScroll({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const story = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = story.current;
    if (!root) return;
    const steps = Array.from(
      root.querySelectorAll<HTMLElement>("[data-story-step]"),
    );
    // On a laptop the steps are a column in their own snapping box, and
    // the one in the middle of the box is the step in view; on a phone
    // they're a row to swipe, and it's the one in the middle of the
    // screen's width.
    const wide = window.matchMedia("(min-width: 64rem)").matches;
    const boxed = wide && getComputedStyle(root).overflowY === "auto";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            root.dataset.active = (
              entry.target as HTMLElement
            ).dataset.storyStep;
          }
        }
      },
      {
        root: boxed ? root : null,
        rootMargin: wide ? "-45% 0px -45% 0px" : "0px -49% 0px -49%",
      },
    );
    for (const step of steps) observer.observe(step);
    root.dataset.ready = "";
    const stopWheel = boxed ? oneStepPerScroll(root, steps.length) : () => {};
    return () => {
      observer.disconnect();
      stopWheel();
    };
  }, []);

  return (
    <div ref={story} data-active="0" className={className}>
      {children}
    </div>
  );
}

// Mouse wheels and trackpads, on a laptop: each scroll over the box moves
// exactly one step. A scroll is everything until the wheel has been still
// for a moment, so however hard the flick, and however long a trackpad's
// glide runs on, it's one step; small movements add up until they count.
// A scroll that arrives while the box is only partly on screen first
// brings it fully into view, just under the header (its bottom at the
// bottom of the window: the box is the window's height less the
// header's). Past the first or last step, scrolling carries on down (or
// up) the page as usual. Touchscreens and keyboards are left to the
// browser's own snapping (components/home-story.css).
function oneStepPerScroll(root: HTMLElement, count: number): () => void {
  const still = 160; // ms without a wheel event that ends a scroll
  const settle = 600; // ms a step takes to arrive
  const enough = 24; // px of movement that counts as a scroll
  const gentle = window.matchMedia("(prefers-reduced-motion: reduce)");
  let blockedUntil = 0;
  let lastWheel = 0;
  let pushed = 0;
  let used = false; // this scroll has already moved a step

  const go = (top: number, target: Window | HTMLElement) => {
    used = true;
    pushed = 0;
    blockedUntil = performance.now() + settle;
    target.scrollTo({ top, behavior: gentle.matches ? "auto" : "smooth" });
  };

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
      return; // zooming, or sideways
    const now = performance.now();
    if (now - lastWheel > still) {
      used = false; // a new scroll
      pushed = 0;
    }
    lastWheel = now;
    const busy = used || now < blockedUntil;
    const down = event.deltaY > 0;
    const height = root.clientHeight;
    const current = Math.round(root.scrollTop / height);
    const atEnd = down ? current >= count - 1 : current <= 0;
    if (atEnd && !busy) return; // the page scrolls on
    event.preventDefault();
    if (busy) return;
    // Movement adds up in one direction; turning round starts again.
    pushed = Math.sign(pushed) === Math.sign(event.deltaY) ? pushed : 0;
    pushed += event.deltaY;
    if (Math.abs(pushed) < enough) return;
    // Not quite in view yet: line the box up under the header first.
    const box = root.getBoundingClientRect();
    const header =
      document.querySelector(".site-header")?.getBoundingClientRect().bottom ??
      0;
    if (box.top < header - 2 || box.bottom > window.innerHeight + 2) {
      go(window.scrollY + box.bottom - window.innerHeight, window);
      return;
    }
    go((current + (down ? 1 : -1)) * height, root);
  };

  root.addEventListener("wheel", onWheel, { passive: false });
  return () => root.removeEventListener("wheel", onWheel);
}
