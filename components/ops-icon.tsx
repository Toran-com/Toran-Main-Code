import type { ReactNode } from "react";

// The admin area's line icons, in the same 24px, 2px rounded line as the
// rest of Toran's (components/line-icons.tsx). Decoration beside words.
export type OpsIconName =
  | "grid"
  | "sun"
  | "alert"
  | "inbox"
  | "copy"
  | "globe"
  | "calendar"
  | "mandir"
  | "mail"
  | "send"
  | "language"
  | "chart";

const ICONS: Record<OpsIconName, ReactNode> = {
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  alert: <path d="M12 3.5 2.5 20h19zM12 10v4.5M12 17.5v.01" />,
  inbox: (
    <path d="M3.5 13.5 6 5h12l2.5 8.5V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1zM3.5 13.5H8.5l1.5 2.5h4l1.5-2.5h5" />
  ),
  copy: <path d="M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5S14.5 17.9 12 20.5C9.5 17.9 8.4 15.1 8.4 12S9.5 6.1 12 3.5z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  mandir: (
    <>
      <path d="M12 2.5v2M12 4.5 7.5 11h9z" />
      <path d="M5 11h14v9.5H5zM10 20.5v-4.5a2 2 0 0 1 4 0v4.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  send: <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5-7.5-4z" />,
  language: (
    <path d="M3.5 6h9M8 4v2c0 4-2 7-4.5 8.5M5.5 9.5c1 2.5 3.5 4.5 6 5.5M13 20l3.5-9 3.5 9M14.2 17h4.6" />
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
};

export function OpsIcon({
  name,
  className = "size-6",
}: {
  name: OpsIconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}
