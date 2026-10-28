import Link from "next/link";
import { PageShell } from "@/components/page-shell";

// Shown for any address that isn't a page: the ways back into the site,
// not just the home page.
const WAYS = [
  { href: "/whats-on", label: "What's on at mandirs near you" },
  { href: "/mandirs", label: "Find a mandir" },
  { href: "/festivals", label: "Festival dates" },
  { href: "/", label: "The Toran home page" },
];

export default function NotFound() {
  return (
    <PageShell title="Page not found">
      <p className="text-muted text-lg">
        This page could not be found. It may have moved, or the link may be
        wrong. Try one of these instead:
      </p>
      <ul className="flex flex-col gap-2">
        {WAYS.map((w) => (
          <li key={w.href}>
            <Link
              href={w.href}
              className="text-peacock font-semibold underline"
            >
              {w.label}
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
