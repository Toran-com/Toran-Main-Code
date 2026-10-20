import Link from "next/link";
import { Card, pillButtonClass } from "@/components/ui";
import {
  committeeTasks,
  setupDone,
  setupSteps,
  type CommitteeFacts,
} from "@/lib/committee-tasks";

// The top of a mandir's committee page: getting started (until the basics
// are done), then what needs doing now. Links within the page are "#…";
// `base` puts the page's address in front, for the account page.
export function CommitteeTodo({
  facts,
  base = "",
}: {
  facts: CommitteeFacts;
  base?: string;
}) {
  const tasks = committeeTasks(facts);
  const steps = setupSteps(facts);
  const href = (h: string) => (h.startsWith("#") ? `${base}${h}` : h);
  return (
    <>
      {!setupDone(facts) && (
        <Card>
          <h2 className="text-xl font-bold sm:text-2xl">Getting started</h2>
          <ol className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <li key={step.key} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`grid size-8 shrink-0 place-items-center rounded-full font-bold ${
                    step.done
                      ? "bg-peacock text-on-peacock"
                      : "border-line border-2"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <span className="flex flex-col">
                  {step.done ? (
                    <span className="text-muted font-semibold line-through">
                      {step.title}
                      <span className="sr-only"> (done)</span>
                    </span>
                  ) : (
                    <Link
                      href={href(step.href)}
                      className="text-peacock font-semibold underline"
                    >
                      {step.title}
                    </Link>
                  )}
                  {!step.done && (
                    <span className="text-muted text-base">{step.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
      {tasks.length > 0 ? (
        <Card>
          <h2 className="text-xl font-bold sm:text-2xl">What needs doing</h2>
          <ul className="divide-line flex flex-col divide-y">
            {tasks.map((task) => (
              <li
                key={task.key}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex flex-col">
                  <span className="font-semibold">{task.title}</span>
                  <span className="text-muted text-base">{task.detail}</span>
                </span>
                <Link
                  href={href(task.href)}
                  className={`${pillButtonClass} self-start`}
                >
                  {task.action}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        setupDone(facts) && (
          <p className="bg-peacock/10 text-peacock rounded-2xl px-4 py-3 font-semibold">
            ✓ All up to date. Nothing needs doing just now.
          </p>
        )
      )}
    </>
  );
}
