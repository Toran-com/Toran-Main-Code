"use client";

import { type ReactNode, useEffect, useRef } from "react";

// The scroll story on the home page (components/home-story.tsx): marks
// which step is in the middle of the screen, as data-active on the
// story, so app/globals.css can show that step's screen in the phone.
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
    // On a laptop the steps are a column, and the one in the middle of
    // the screen's height is the step in view; on a phone they're a row
    // to swipe, and it's the one in the middle of the screen's width.
    const wide = window.matchMedia("(min-width: 64rem)").matches;
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
      { rootMargin: wide ? "-45% 0px -45% 0px" : "0px -49% 0px -49%" },
    );
    for (const step of steps) observer.observe(step);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={story} data-active="0" className={className}>
      {children}
    </div>
  );
}
