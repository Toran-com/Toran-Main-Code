import Link from "next/link";
import type { ReactNode } from "react";
import { LineIcon, type LineIconName } from "@/components/line-icons";
import { quietButtonClass } from "@/components/ui";

// When a list has nothing in it: say so plainly, then offer the next
// steps as buttons (look further, show everything) rather than leave
// someone at a dead end.
export function Empty({
  title,
  icon = "decorations",
  steps = [],
  children,
}: {
  title: string;
  icon?: LineIconName;
  steps?: { href: string; label: string }[];
  children?: ReactNode;
}) {
  return (
    <div className="bg-sunk flex flex-col items-start gap-4 rounded-3xl p-6 sm:p-8">
      <span className="bg-surface text-peacock grid size-14 place-items-center rounded-full">
        <LineIcon name={icon} className="size-7" />
      </span>
      <p className="font-display text-2xl leading-tight sm:text-3xl">{title}</p>
      {steps.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {steps.map((step) => (
            <Link key={step.href} href={step.href} className={quietButtonClass}>
              {step.label}
            </Link>
          ))}
        </div>
      )}
      {children && <p className="text-muted">{children}</p>}
    </div>
  );
}
