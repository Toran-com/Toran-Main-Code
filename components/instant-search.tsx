"use client";

import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { buttonClass, inputClass } from "@/components/ui";

// The search box, with results that change as you type (a moment after
// you stop, so a slow phone isn't asked for every letter). The results
// themselves come from the server (app/(public)/(directory)/search), so
// it's the same search with or without JavaScript: without, the form is
// sent as usual. From the box, ↓ goes to the results; in them, ↑ and ↓
// move between them and Esc comes back to the box.

const WAIT_MS = 250;

export function InstantSearch({
  path,
  initial,
  labels,
  children,
}: {
  path: string;
  initial: string;
  labels: {
    label: string;
    example: string;
    button: string;
    keys: string;
    searching: string;
  };
  children: ReactNode;
}) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [pending, startTransition] = useTransition();
  const sent = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const box = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);

  // Back and forward bring another search: show its words in the box.
  useEffect(() => {
    if (initial !== sent.current) {
      sent.current = initial;
      setText(initial);
    }
  }, [initial]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (value: string) => {
    clearTimeout(timer.current);
    const q = value.trim();
    if (q === sent.current.trim()) return;
    sent.current = q;
    const url = q ? `${path}?${new URLSearchParams({ q })}` : path;
    startTransition(() => router.replace(url, { scroll: false }));
  };

  const links = () =>
    Array.from(
      results.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [],
    ).filter((a) => a.offsetParent !== null);

  const fromBox = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      const first = links()[0];
      if (first) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === "Escape" && text) {
      event.preventDefault();
      setText("");
      go("");
    }
  };

  const inResults = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Escape"].includes(event.key)) return;
    const all = links();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (at === -1) return;
    event.preventDefault();
    if (event.key === "Escape") return box.current?.focus();
    const next = at + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0) box.current?.focus();
    else all[Math.min(next, all.length - 1)].focus();
  };

  return (
    <>
      <form
        role="search"
        action={path}
        onSubmit={(event) => {
          event.preventDefault();
          go(text);
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="q" className="font-semibold">
          {labels.label}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            ref={box}
            id="q"
            name="q"
            type="search"
            value={text}
            onChange={(event) => {
              const value = event.target.value;
              setText(value);
              clearTimeout(timer.current);
              // One letter finds too much to be useful.
              if (value.trim().length !== 1) {
                timer.current = setTimeout(() => go(value), WAIT_MS);
              }
            }}
            onKeyDown={fromBox}
            placeholder={labels.example}
            enterKeyHint="search"
            autoComplete="off"
            aria-describedby="search-keys"
            className={`${inputClass} min-w-0 flex-[3_1_14rem]`}
          />
          <button
            type="submit"
            className={`${buttonClass} flex-[1_1_8rem] sm:w-auto`}
          >
            {labels.button}
          </button>
        </div>
        <p id="search-keys" className="text-muted hidden text-base sm:block">
          {labels.keys}
        </p>
      </form>
      <p role="status" className="sr-only">
        {pending ? labels.searching : ""}
      </p>
      <div
        ref={results}
        onKeyDown={inResults}
        aria-busy={pending}
        className={`flex flex-col gap-8 transition-opacity duration-200 sm:gap-10 ${pending ? "opacity-70" : ""}`}
      >
        {children}
      </div>
    </>
  );
}
