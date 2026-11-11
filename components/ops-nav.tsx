"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OpsIcon } from "@/components/ops-icon";
import "./ops-nav.css";
import { currentTool, OPS_GROUPS, type OpsCounts } from "@/lib/ops-tools";

// The admin area's menu (components/ops-chrome.tsx puts it in the side
// bar on a laptop and behind "Admin menu" on a phone): the tools in their
// groups, each with a picture, and a count where something is waiting.

export function OpsNav({ counts }: { counts: OpsCounts }) {
  const here = currentTool(usePathname());
  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {OPS_GROUPS.map((group) => (
        <section key={group.label} className="flex flex-col gap-1">
          <h2 className="ops-nav-heading px-3 pb-1 text-base font-bold tracking-[0.1em] uppercase">
            {group.label}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {group.tools.map((tool) => {
              const current = tool.href === here;
              const count = tool.count ? (counts[tool.count] ?? 0) : 0;
              return (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    aria-current={current ? "page" : undefined}
                    className="ops-nav-link flex items-center gap-3 rounded-xl px-3 py-2 text-lg font-semibold no-underline transition-colors"
                  >
                    <OpsIcon name={tool.icon} />
                    <span className="flex-1">{tool.label}</span>
                    {count > 0 && (
                      <span className="bg-marigold text-night min-w-7 rounded-full px-2 text-center text-base font-bold">
                        <span className="sr-only">, </span>
                        {count}
                        <span className="sr-only"> waiting</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
