import Link from "next/link";
import {
  committeeTasks,
  setupDone,
  setupSteps,
  type CommitteeFacts,
} from "@/lib/committee-tasks";

// The committee's to-do list, near the top of its page: the setup steps
// still to do (with how far along they are), then what needs doing now.
// Each is one row to tap: a link in the page ("#details") opens that
// part's sheet (components/sheet.tsx), so it's a plain <a> that the sheet
// hears; other pages are a Link.
export function CommitteeTodo({ facts }: { facts: CommitteeFacts }) {
  const tasks = committeeTasks(facts);
  const steps = setupSteps(facts);
  const settingUp = !setupDone(facts);
  const stepsDone = steps.filter((s) => s.done).length;
  const rows = [
    ...(settingUp ? steps.filter((s) => !s.done) : []).map((s) => ({
      key: s.key,
      title: s.title,
      detail: s.detail,
      href: s.href,
      action: "",
    })),
    ...tasks,
  ];

  if (!rows.length) {
    return (
      <p className="bg-peacock/10 text-peacock rounded-2xl px-4 py-3 font-semibold">
        ✓ All up to date. Nothing needs doing just now.
      </p>
    );
  }
  return (
    <section
      aria-labelledby="todo"
      className="border-line bg-surface shadow-card flex flex-col rounded-3xl border"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 pt-4 pb-1">
        <h2 id="todo" className="text-xl font-bold">
          To do
        </h2>
        {settingUp && (
          <span className="text-muted flex items-center gap-2 text-base">
            Set up {stepsDone} of {steps.length}
            <span
              aria-hidden="true"
              className="bg-sunk h-2 w-14 overflow-hidden rounded-full"
            >
              <span
                className="bg-peacock block h-full rounded-full"
                style={{ width: `${(stepsDone / steps.length) * 100}%` }}
              />
            </span>
          </span>
        )}
      </div>
      <ul className="flex flex-col px-2 pb-2">
        {rows.map((row) => {
          const setup = !row.action;
          const inner = (
            <>
              <span
                aria-hidden="true"
                className={`grid size-9 shrink-0 place-items-center rounded-full ${
                  setup
                    ? "border-line-strong text-muted border-2 border-dashed"
                    : "bg-marigold/20 text-marigold-ink"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={ICONS[row.key] ?? ICONS.default} />
                </svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="leading-snug font-semibold">{row.title}</span>
                <span className="text-muted line-clamp-2 text-base leading-snug">
                  {row.detail}
                </span>
              </span>
              <span className="text-peacock flex shrink-0 items-center gap-1 text-base font-semibold">
                {row.action && (
                  <span className="hidden sm:inline">{row.action}</span>
                )}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </span>
            </>
          );
          const rowClass =
            "hover:bg-sunk text-ink flex items-center gap-3 rounded-2xl px-3 py-3 no-underline transition active:scale-[0.99]";
          return (
            <li key={row.key}>
              {row.href.startsWith("#") ? (
                <a href={row.href} className={rowClass}>
                  {inner}
                </a>
              ) : (
                <Link href={row.href} className={rowClass}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {settingUp && stepsDone > 0 && (
        <p className="text-muted border-line border-t px-5 py-3 text-base">
          <span aria-hidden="true">✓ </span>
          Done:{" "}
          {steps
            .filter((s) => s.done)
            .map((s) => s.title)
            .join(", ")}
        </p>
      )}
    </section>
  );
}

// A small picture for each kind of row.
const ICONS: Record<string, string> = {
  details:
    "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  event: "M12 5v14M5 12h14",
  colleague:
    "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 8v6M22 11h-6",
  posters: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  confirm: "M5 12l4 4 10-10",
  seva: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v9H5z",
  festival: "M12 3v3M5 21h14M7 21c0-4 2-7 5-9 3 2 5 5 5 9",
  empty: "M12 5v14M5 12h14",
  default: "M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
};
