"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

// Sheets: forms and choices that stay out of the way until they're
// wanted. Press the button and the sheet comes up from the bottom of a
// phone (in the middle of a bigger screen), over a dimmed page; Escape,
// the close button or a tap on the dimmed page puts it away. Built on the
// browser's own <dialog>, so the keyboard and screen readers stay inside
// it while it's open. Styles: .sheet in app/globals.css.
//
// A link to one of a sheet's ids (#details, #add-event…) opens it, from
// the to-do list or another page. Closing it takes the id back off the
// address, so the same link opens it again.
//
// `open` and `stamp` come from the page. Each time the page is drawn
// afresh (after a form in a sheet is sent, say) `stamp` changes: the
// sheet opens if `open` names one of its ids (to show what went wrong, or
// what to do next), or closes if its form was the one sent. Shown again
// after another tab, with the same stamp, it's left as it was.

function useSheet(ids: string[], openWith: string | undefined, stamp: number) {
  const ref = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const seen = useRef<number | null>(null);
  const sent = useRef(false);
  const page = useRef("");
  const key = ids.join(" ");

  // The way to show, chosen as the page is drawn rather than after.
  const [shownFor, setShownFor] = useState<number | null>(null);
  if (openWith && shownFor !== stamp) {
    setShownFor(stamp);
    setCurrent(openWith);
  }
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || seen.current === stamp) return;
    seen.current = stamp;
    if (openWith) {
      if (!dialog.open) dialog.showModal();
    } else if (sent.current && dialog.open) {
      dialog.close();
    }
    sent.current = false;
  }, [stamp, openWith]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    page.current = location.pathname;
    const ours = key.split(" ");
    function fromHash() {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!ours.includes(id)) return;
      setCurrent(id);
      if (!dialog!.open) dialog!.showModal();
    }
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      // Leaving the page: never leave a sheet open behind it.
      if (dialog.open) dialog.close();
    };
  }, [key]);

  const dialogProps = {
    ref,
    className: "sheet",
    onClose: () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (location.pathname === page.current && key.split(" ").includes(id)) {
        history.replaceState(
          history.state,
          "",
          location.pathname + location.search,
        );
      }
    },
    // A tap on the dimmed page, or on a link inside, puts it away.
    onClick: (e: MouseEvent<HTMLDialogElement>) => {
      const target = e.target as HTMLElement;
      if (target === e.currentTarget || target.closest("a[href]")) {
        e.currentTarget.close();
      }
    },
    onSubmit: () => {
      sent.current = true;
    },
  };
  return { ref, current, setCurrent, dialogProps };
}

function SheetHeader({
  titleId,
  title,
  onClose,
  before,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  before?: ReactNode;
}) {
  return (
    <header className="border-line bg-surface sticky top-0 z-10 flex shrink-0 flex-col rounded-t-3xl border-b">
      {/* A handle, so it reads as something that came up from below. */}
      <span
        aria-hidden="true"
        className="bg-line-strong mx-auto mt-2 h-1.5 w-10 rounded-full sm:hidden"
      />
      <div className="flex items-center gap-1 px-3 py-2 sm:px-5 sm:py-3">
        {before}
        <h2
          id={titleId}
          className="min-w-0 flex-1 truncate px-2 text-xl font-bold"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={iconButtonClass}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </header>
  );
}

const iconButtonClass =
  "hover:bg-sunk grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition active:scale-95";

const bodyClass =
  "flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7 sm:pb-7";

// One sheet, opened by its own button.
export function Sheet({
  id,
  title,
  open = false,
  stamp = 0,
  trigger,
  triggerClass,
  triggerLabel,
  children,
}: {
  id: string;
  title: string;
  open?: boolean;
  stamp?: number;
  // What the button shows, and its name if that isn't words.
  trigger: ReactNode;
  triggerClass: string;
  triggerLabel?: string;
  children: ReactNode;
}) {
  const { ref, dialogProps } = useSheet([id], open ? id : undefined, stamp);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={triggerLabel}
        className={triggerClass}
        onClick={() => ref.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog id={id} aria-labelledby={`${id}-title`} {...dialogProps}>
        <SheetHeader
          titleId={`${id}-title`}
          title={title}
          onClose={() => ref.current?.close()}
        />
        <div className={bodyClass}>{children}</div>
      </dialog>
    </>
  );
}

export type AddWay = {
  id: string;
  title: string;
  body: string;
  // An SVG path, drawn in a 24 × 24 box.
  icon: string;
  // A few words in a badge, such as how many festivals are waiting.
  badge?: string;
  content: ReactNode;
};

// "Add events": one button, then a sheet that asks how (a photo of a
// poster, a WhatsApp message, typing it in, ticking festivals) and shows
// only that way's form, with a way back to the choices. "#add" opens it
// at the choices, a way's own id straight at that way.
export function AddEvents({
  ways,
  open,
  stamp = 0,
  notice,
  className,
}: {
  ways: AddWay[];
  open?: string;
  stamp?: number;
  // A message for the way `open` names (what went wrong, say).
  notice?: ReactNode;
  className: string;
}) {
  const ids = ["add", ...ways.map((w) => w.id)];
  const { ref, current, setCurrent, dialogProps } = useSheet(ids, open, stamp);
  const way = ways.find((w) => w.id === current);
  const close = () => ref.current?.close();
  const body = useRef<HTMLDivElement>(null);
  // Choosing a way, or going back, starts from the top.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [current]);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        className={className}
        onClick={() => {
          setCurrent(null);
          ref.current?.showModal();
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add events
      </button>
      <dialog id="add" aria-labelledby="add-title" {...dialogProps}>
        <SheetHeader
          titleId="add-title"
          title={way ? way.title : "Add events"}
          onClose={close}
          before={
            way && (
              <button
                type="button"
                onClick={() => setCurrent(null)}
                aria-label="Back to the ways to add events"
                className={iconButtonClass}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
            )
          }
        />
        <div ref={body} className={bodyClass}>
          {/* The choices. */}
          <div hidden={!!way} className="flex flex-col gap-3">
            <p className="text-muted">Choose whichever is easiest for you.</p>
            <ul className="flex flex-col gap-2">
              {ways.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setCurrent(w.id)}
                    className="border-line hover:border-peacock/50 hover:bg-sunk flex w-full cursor-pointer items-center gap-4 rounded-2xl border p-3 text-left transition active:scale-[0.99]"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-peacock/10 text-peacock grid size-11 shrink-0 place-items-center rounded-2xl"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={w.icon} />
                      </svg>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex flex-wrap items-center gap-x-2 text-lg leading-snug font-bold">
                        {w.title}
                        {w.badge && (
                          <span className="bg-marigold/20 text-marigold-ink rounded-full px-2 text-sm font-semibold">
                            {w.badge}
                          </span>
                        )}
                      </span>
                      <span className="text-muted text-base leading-snug">
                        {w.body}
                      </span>
                    </span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="text-muted size-5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* Each way's form, kept while you look at another, so nothing
              typed is lost. */}
          {ways.map((w) => (
            <div
              key={w.id}
              hidden={w.id !== current}
              className="flex flex-col gap-4"
            >
              {w.id === open && notice}
              {w.content}
            </div>
          ))}
        </div>
      </dialog>
    </>
  );
}
