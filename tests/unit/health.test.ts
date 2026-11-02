import { describe, expect, it } from "vitest";
import { checkHealth, jobStates } from "@/lib/health";

const now = new Date("2026-10-11T12:00:00Z");
const hoursAgo = (h: number) =>
  new Date(now.getTime() - h * 3_600_000).toISOString();
const goodJobs = {
  nightly: { ran_at: hoursAgo(10), cleanup_ok: true },
  weekly: null,
};
// A fake database: health() answers `data`, job_health() answers `jobs`.
const answering = (
  data: unknown,
  error: unknown = null,
  jobs: { data: unknown; error: unknown } = { data: goodJobs, error: null },
) => ({
  rpc: async (fn: "health" | "job_health") =>
    fn === "health" ? { data, error } : jobs,
});

describe("checkHealth", () => {
  it("is ok when the database answers ok", async () => {
    expect(await checkHealth(answering("ok"), now)).toEqual({
      status: "ok",
      database: "ok",
      jobs: { nightly: "ok", weekly: "off" },
      errorReports: "off",
      checkedAt: "2026-10-11T12:00:00.000Z",
    });
  });

  it("says whether errors reach Sentry", async () => {
    const health = await checkHealth(answering("ok"), now, {
      errorReports: true,
    });
    expect(health.errorReports).toBe("on");
    expect((await checkHealth(null, now)).errorReports).toBe("off");
  });

  it("says when the database is not connected or misconfigured", async () => {
    expect((await checkHealth(null, now)).database).toBe("not configured");
    expect((await checkHealth("misconfigured", now)).database).toBe(
      "misconfigured",
    );
    expect(await checkHealth(null, now)).not.toHaveProperty("jobs");
  });

  it("is degraded when the database errors, throws or answers wrongly", async () => {
    const throwing = {
      rpc: async () => {
        throw new Error("network down");
      },
    };
    for (const client of [
      answering(null, { message: "permission denied" }),
      answering("not ok"),
      throwing,
    ]) {
      const health = await checkHealth(client, now);
      expect(health).toMatchObject({
        status: "degraded",
        database: "unreachable",
      });
    }
  });

  it("stays up when only the job times can't be read", async () => {
    const health = await checkHealth(
      answering("ok", null, { data: null, error: { message: "missing" } }),
      now,
    );
    expect(health).toMatchObject({ status: "ok", jobs: null });
  });

  it("gives up after the timeout", async () => {
    const hanging = { rpc: () => new Promise<never>(() => {}) };
    const health = await checkHealth(hanging, now, { timeoutMs: 20 });
    expect(health.database).toBe("unreachable");
  });
});

describe("jobStates", () => {
  const nightly = (ran_at: unknown, cleanup_ok: unknown = true) =>
    jobStates({ nightly: { ran_at, cleanup_ok }, weekly: null }, now, false)
      .nightly;

  it("knows when the nightly job ran, stopped or never ran", () => {
    expect(nightly(hoursAgo(20))).toBe("ok");
    expect(nightly(hoursAgo(35))).toBe("ok");
    expect(nightly(hoursAgo(37))).toBe("late");
    expect(jobStates({ nightly: null, weekly: null }, now, false).nightly).toBe(
      "never",
    );
  });

  it("notices when the nightly clean-up failed", () => {
    expect(nightly(hoursAgo(2), false)).toBe("cleanup failed");
  });

  it("treats anything malformed as never having run", () => {
    for (const answer of [null, "ok", 3, {}, { nightly: { ran_at: "x" } }]) {
      expect(jobStates(answer, now, true)).toEqual({
        nightly: "never",
        weekly: "not yet",
      });
    }
  });

  it("only watches the weekly email when it's switched on", () => {
    const weekly = (w: unknown, on = true) =>
      jobStates({ nightly: null, weekly: w }, now, on).weekly;
    expect(weekly({ ran_at: hoursAgo(300), failed: 0 }, false)).toBe("off");
    expect(weekly(null)).toBe("not yet");
    expect(weekly({ ran_at: hoursAgo(24 * 7), failed: 0 })).toBe("ok");
    expect(weekly({ ran_at: hoursAgo(24 * 9), failed: 0 })).toBe("late");
    expect(weekly({ ran_at: hoursAgo(24), failed: 3 })).toBe("some failed");
  });
});
