"use client";

import { useEffect, useRef } from "react";
import "./hero-diya.css";

// The home page's lit diya and the candlelight around it (app/(public)/
// page.tsx). The flame flickers on its own; it leans towards the mouse,
// sways when the page is scrolled (like a draught), and the warm light it
// throws across the welcome follows it and grows as you scroll down.
//
// No React state: a few CSS variables on the welcome section
// ([data-hero]) are updated in animation frames, only while something is
// moving. Nothing moves for anyone whose device asks for less motion.
export function HeroDiya() {
  const diya = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = diya.current;
    const hero = el?.closest<HTMLElement>("[data-hero]");
    if (!el || !hero) return;

    // Where the light comes from: the flame, wherever the layout put it.
    const place = () => {
      const r = el.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      const y = r.top - h.top + r.height * 0.3;
      hero.style.setProperty("--light-y", `${(y / h.height) * 100}%`);
    };
    place();
    const sized = new ResizeObserver(place);
    sized.observe(hero);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => sized.disconnect();
    }

    let lean = 0; // degrees the flame leans now
    let toward = 0; // where the mouse pulls it
    let draught = 0; // a push from scrolling, dying away
    let lx = 0,
      ly = 0,
      tx = 0,
      ty = 0; // the light's drift, -0.5 to 0.5
    let lastScroll = window.scrollY;
    let frame = 0;

    const tick = () => {
      draught *= 0.9;
      const goal = Math.max(-18, Math.min(18, toward + draught));
      lean += (goal - lean) * 0.08;
      lx += (tx - lx) * 0.05;
      ly += (ty - ly) * 0.05;
      const below = Math.min(
        1,
        window.scrollY / Math.max(1, hero.offsetHeight),
      );
      hero.style.setProperty("--lean", `${lean.toFixed(2)}deg`);
      hero.style.setProperty("--lx", lx.toFixed(3));
      hero.style.setProperty("--ly", ly.toFixed(3));
      hero.style.setProperty("--scrolled", below.toFixed(3));
      const moving =
        Math.abs(goal - lean) > 0.05 ||
        Math.abs(draught) > 0.05 ||
        Math.abs(tx - lx) > 0.002 ||
        Math.abs(ty - ly) > 0.002;
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const go = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      toward = Math.max(-1, Math.min(1, dx / 520)) * 14;
      const h = hero.getBoundingClientRect();
      tx = Math.max(-0.5, Math.min(0.5, (e.clientX - h.left) / h.width - 0.5));
      ty = Math.max(-0.5, Math.min(0.5, (e.clientY - h.top) / h.height - 0.5));
      go();
    };
    const onLeave = () => {
      toward = 0;
      tx = 0;
      ty = 0;
      go();
    };
    const onScroll = () => {
      const y = window.scrollY;
      // Only while the welcome is on screen.
      if (y < hero.offsetHeight * 1.2) {
        draught += (lastScroll - y) * 0.12;
        go();
      }
      lastScroll = y;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sized.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={diya} aria-hidden="true" className="hero-diya">
      <div className="hero-diya-halo" />
      <svg viewBox="0 0 200 200" className="hero-diya-art" fill="none">
        <g className="hero-diya-lean">
          <g className="hero-diya-flame">
            <path
              d="M100 28c15 19 21 33 21 45a21 21 0 0 1-42 0c0-12 6-26 21-45z"
              fill="#d9a441"
            />
            <path
              className="hero-diya-core"
              d="M100 56c6 8 8 13.5 8 18a8 8 0 0 1-16 0c0-4.5 2-10 8-18z"
              fill="#f6e7b8"
            />
          </g>
        </g>
        <path
          d="M100 94v12"
          stroke="#d9a441"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M26 116h148c-6 34-36 56-74 56s-68-22-74-56z"
          stroke="#d9a441"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M48 134c14 9 32 14 52 14s38-5 52-14"
          stroke="#d9a441"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {[44, 72, 100, 128, 156].map((x) => (
          <circle key={x} cx={x} cy="116" r="3.5" fill="#d9a441" />
        ))}
      </svg>
      {/* Sparks that drift up from the flame. */}
      <div className="hero-diya-sparks">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}

// The candlelight behind the welcome: a warm glow centred on the flame
// that breathes, drifts after the mouse and grows as you scroll, over a
// slow wash of lapis. Purely decorative.
export function HeroLight() {
  return (
    <div aria-hidden="true" className="hero-light">
      <div className="hero-light-wash" />
      <div className="hero-light-glow">
        <div className="hero-light-breath" />
      </div>
    </div>
  );
}
