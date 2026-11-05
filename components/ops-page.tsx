import type { ReactNode } from "react";

// One admin page (inside components/ops-chrome.tsx's frame): its name
// large, a line on what it's for, any actions on the right, then the work.
export function OpsPage({
  title,
  intro,
  actions,
  children,
}: {
  title: string;
  intro?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="rise mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-10">
      <header className="border-line flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            {title}
          </h1>
          {intro && <p className="text-muted max-w-2xl text-lg">{intro}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </header>
      {children}
    </main>
  );
}
