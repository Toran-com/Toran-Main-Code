import Link from "next/link";
import type { ReactNode } from "react";
import { ToranGarland } from "@/components/toran-garland";

// The narrow card layout used by login, account and admin pages.
export function PageShell({
  title,
  wide = false,
  children,
}: {
  title: string;
  // Wider pages for admin lists and forms.
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col gap-8 px-6 py-16 ${wide ? "max-w-3xl" : "max-w-lg"}`}
    >
      <Link href="/" aria-label="Toran home" className="self-start">
        <ToranGarland className="h-8 w-36" />
      </Link>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {title}
      </h1>
      {children}
    </main>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface border-line flex flex-col gap-5 rounded-2xl border p-6 shadow-sm">
      {children}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const colours = {
    info: "border-line bg-sunk",
    error: "border-kumkum text-kumkum bg-surface",
    success: "border-peacock text-peacock bg-surface",
  }[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 ${colours}`}
    >
      {children}
    </p>
  );
}

export const inputClass =
  "border-line bg-surface focus:outline-peacock w-full rounded-xl border px-4 py-3 text-lg focus:outline-2";

export const buttonClass =
  "bg-peacock w-full rounded-xl px-5 py-3 text-lg font-semibold text-white hover:opacity-90 disabled:opacity-60";

export const quietButtonClass =
  "border-line text-ink hover:bg-sunk rounded-xl border px-5 py-3 text-lg font-semibold";

export function Loading() {
  return <p className="text-muted">Loading…</p>;
}
