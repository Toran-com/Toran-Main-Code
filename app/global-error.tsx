"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Shown if the whole page fails to render. Reports the error to Sentry.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#faf8f4",
          color: "#1b1a2c",
          padding: "4rem 1.5rem",
          fontSize: "18px",
        }}
      >
        <main style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2rem" }}>Something went wrong</h1>
          <p>
            Sorry, this page didn&apos;t load. We&apos;ve been told and will
            look into it.
          </p>
          <button
            onClick={reset}
            style={{
              fontSize: "18px",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.75rem",
              border: 0,
              background: "#0b6b68",
              color: "#fff",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
