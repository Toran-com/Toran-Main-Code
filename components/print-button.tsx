"use client";

import { buttonClass } from "@/components/ui";

// Opens the browser's print dialog. Hidden on the printout itself.
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`${buttonClass} print:hidden`}
    >
      {label}
    </button>
  );
}
