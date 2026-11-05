import { type ReactNode, Suspense } from "react";
import { OpsChrome } from "@/components/ops-chrome";

// Every admin page sits in the same frame: the side bar stays put on a
// laptop as you move between tools (components/ops-chrome.tsx).
export default function OpsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col lg:has-[.ops-sidebar]:grid lg:has-[.ops-sidebar]:grid-cols-[18rem_minmax(0,1fr)] lg:has-[.ops-sidebar]:items-start">
      <Suspense fallback={<div className="bg-night h-16" />}>
        <OpsChrome />
      </Suspense>
      {children}
    </div>
  );
}
