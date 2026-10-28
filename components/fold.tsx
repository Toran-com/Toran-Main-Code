import type { ReactNode } from "react";
import { cardClass } from "@/components/ui";

// A card that folds away: its heading is always there, tap to open it.
// For the less-used parts of long pages (the committee page), so what's
// done every week stays near the top. A link to the card's id opens it
// (OpenFromHash).
export function Fold({
  id,
  title,
  hint,
  open = false,
  children,
}: {
  id: string;
  title: string;
  // A few words under the heading, shown while it's folded too.
  hint?: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details id={id} open={open} className={`${cardClass} group scroll-mt-24`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-7 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-1">
          <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
          {hint && <span className="text-muted text-base">{hint}</span>}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="text-peacock size-6 shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5 sm:gap-5 sm:px-7 sm:pb-7">
        {children}
      </div>
    </details>
  );
}
