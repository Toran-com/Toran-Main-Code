export type DatabaseState =
  "ok" | "not configured" | "misconfigured" | "unreachable";

// How Toran's own scheduled jobs are doing, from their latest runs.
export type NightlyState = "ok" | "late" | "never" | "cleanup failed";
export type WeeklyState = "off" | "ok" | "late" | "not yet" | "some failed";

export type Health = {
  status: "ok" | "degraded";
  database: DatabaseState;
  // Only when the database answers; null if the job times can't be read.
  jobs?: { nightly: NightlyState; weekly: WeeklyState } | null;
  // Whether errors are sent to Sentry. Not a secret: the Sentry address
  // is in every page's code when it's set.
  errorReports: "on" | "off";
  checkedAt: string;
};

// Anything with Supabase's rpc() shape, so tests can pass a fake.
type RpcClient = {
  rpc: (
    fn: "health" | "job_health",
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

const TIMEOUT_MS = 3000;

// The nightly job runs at 02:15 (vercel.json). A run more than this long
// ago means it has stopped; /ops/attention says the same.
export const NIGHTLY_LATE_HOURS = 36;
// The weekly email goes on Thursday mornings.
const WEEKLY_LATE_HOURS = 8 * 24;

type Options = {
  timeoutMs?: number;
  // Whether the weekly email is switched on (and so should have run).
  weeklyOn?: boolean;
  errorReports?: boolean;
};

const hoursSince = (at: unknown, now: Date) =>
  typeof at === "string" && !Number.isNaN(Date.parse(at))
    ? (now.getTime() - Date.parse(at)) / 3_600_000
    : null;

// Reads public.job_health(). Anything malformed counts as "never ran",
// which raises the alarm rather than hiding a problem.
export function jobStates(
  answer: unknown,
  now: Date,
  weeklyOn: boolean,
): { nightly: NightlyState; weekly: WeeklyState } {
  const a = (answer && typeof answer === "object" ? answer : {}) as {
    nightly?: { ran_at?: unknown; cleanup_ok?: unknown } | null;
    weekly?: { ran_at?: unknown; failed?: unknown } | null;
  };
  const nightlyHours = hoursSince(a.nightly?.ran_at, now);
  const nightly: NightlyState =
    nightlyHours === null
      ? "never"
      : nightlyHours > NIGHTLY_LATE_HOURS
        ? "late"
        : a.nightly?.cleanup_ok === true
          ? "ok"
          : "cleanup failed";

  const weeklyHours = hoursSince(a.weekly?.ran_at, now);
  const failed = typeof a.weekly?.failed === "number" ? a.weekly.failed : 0;
  const weekly: WeeklyState = !weeklyOn
    ? "off"
    : weeklyHours === null
      ? "not yet"
      : weeklyHours > WEEKLY_LATE_HOURS
        ? "late"
        : failed > 0
          ? "some failed"
          : "ok";
  return { nightly, weekly };
}

export async function checkHealth(
  client: RpcClient | null | "misconfigured",
  now: Date = new Date(),
  options: Options = {},
): Promise<Health> {
  const { timeoutMs = TIMEOUT_MS, weeklyOn = false } = options;
  const errorReports = options.errorReports ? "on" : "off";
  const result = (database: DatabaseState, jobs?: Health["jobs"]): Health => ({
    status: database === "ok" ? "ok" : "degraded",
    database,
    ...(database === "ok" ? { jobs: jobs ?? null } : {}),
    errorReports,
    checkedAt: now.toISOString(),
  });

  if (client === null) return result("not configured");
  if (client === "misconfigured") return result("misconfigured");

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  try {
    const answers = await Promise.race([
      Promise.all([client.rpc("health"), client.rpc("job_health")]),
      timeout,
    ]);
    if (answers === "timeout") return result("unreachable");
    const [health, jobs] = answers;
    if (health.error || health.data !== "ok") return result("unreachable");
    return result(
      "ok",
      jobs.error ? null : jobStates(jobs.data, now, weeklyOn),
    );
  } catch {
    return result("unreachable");
  } finally {
    clearTimeout(timer);
  }
}
