"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Fetches the page's figures again every so often while it's open (Today in
// the admin area), and says when they were last updated.
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  const [at, setAt] = useState<Date | null>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setAt(new Date());
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return (
    <p className="text-muted text-base" aria-live="off">
      Updates every minute while this page is open
      {at &&
        ` · last ${at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
      .
    </p>
  );
}
