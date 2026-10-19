import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { nightlyStatus } from "@/lib/attention";
import type { Database } from "@/lib/database.types";
import { isCronRequest, runNightly } from "@/lib/nightly";
import type { CheckResult } from "@/lib/website-check";

// A stand-in for the database: every query method returns the same
// builder, and awaiting it gives what that table would.
function fakeDb(mandirs: { id: string; website: string }[]) {
  const written: { table: string; op: string; value: unknown }[] = [];
  const answer = (table: string, op: string) => {
    if (op === "insert" && table === "sources") return { data: { id: "src" } };
    if (op === "select" && table === "mandirs") return { data: mandirs };
    if (op === "select" && table === "sources") return { data: null };
    if (op === "select") return { data: [] };
    return { data: null, error: null };
  };
  const from = (table: string) => {
    let op = "select";
    const builder: Record<string, unknown> = {};
    for (const name of ["select", "not", "neq", "eq", "gte", "limit", "order"])
      builder[name] = () => builder;
    builder.insert = (value: unknown) => {
      op = "insert";
      written.push({ table, op, value });
      return builder;
    };
    builder.update = (value: unknown) => {
      op = "update";
      written.push({ table, op, value });
      return builder;
    };
    builder.single = builder.maybeSingle = () =>
      Promise.resolve(answer(table, op));
    builder.then = (resolve: (v: unknown) => unknown) =>
      resolve(answer(table, op));
    return builder;
  };
  const rpc = (name: string) =>
    Promise.resolve(
      name === "run_retention"
        ? { data: { invites: 2, approved_claims: 0 }, error: null }
        : { data: null, error: { message: "no" } },
    );
  return {
    db: { from, rpc } as unknown as SupabaseClient<Database>,
    written,
  };
}

const found = (n: number): CheckResult => ({
  outcome: n ? "found" : "none",
  events: Array.from({ length: n }, (_, i) => ({
    title: `Event ${i}`,
    date: "2030-01-0" + (i + 1),
    time: "",
    summary: "",
    link: "https://example.org",
    kind: "other",
  })),
  pagesRead: 1,
  notes: [],
});

describe("runNightly", () => {
  const MANDIRS = ["a", "b", "c", "d"].map((id) => ({
    id,
    website: `https://${id}.example.org`,
  }));

  it("cleans up, checks the websites and records totals", async () => {
    const { db, written } = fakeDb(MANDIRS);
    const checked: string[] = [];
    const summary = await runNightly(
      db,
      async (url) => {
        checked.push(url);
        return found(url.startsWith("https://a.") ? 2 : 0);
      },
      () => 0,
    );
    expect(checked.sort()).toEqual(MANDIRS.map((m) => m.website));
    expect(summary).toEqual({
      retention: { invites: 2, approved_claims: 0 },
      websites: { checked: 4, added: 2, failed: 0 },
    });
    expect(written.filter((w) => w.table === "job_runs")).toEqual([
      { table: "job_runs", op: "insert", value: { job: "nightly", summary } },
    ]);
  });

  it("stops starting new checks when time's up", async () => {
    const { db } = fakeDb(MANDIRS);
    let clock = 0;
    const summary = await runNightly(
      db,
      async () => {
        await Promise.resolve();
        clock += 30_000;
        return found(0);
      },
      () => clock,
    );
    // Three start at once; none start after the first finishes late.
    expect(summary.websites.checked).toBe(3);
  });
});

describe("isCronRequest", () => {
  it("needs the exact secret, and a secret to be set", () => {
    expect(isCronRequest("Bearer s3cret-value", "s3cret-value")).toBe(true);
    expect(isCronRequest("Bearer wrong-value", "s3cret-value")).toBe(false);
    expect(isCronRequest("s3cret-value", "s3cret-value")).toBe(false);
    expect(isCronRequest(null, "s3cret-value")).toBe(false);
    expect(isCronRequest("Bearer ", "")).toBe(false);
    expect(isCronRequest("Bearer undefined", undefined)).toBe(false);
  });
});

describe("nightlyStatus", () => {
  const now = new Date("2026-10-20T09:00:00Z");
  it("says when the job never ran, ran lately, or has stopped", () => {
    expect(nightlyStatus(null, now)).toEqual({ state: "never" });
    expect(
      nightlyStatus(
        {
          ran_at: "2026-10-20T02:15:00Z",
          summary: {
            retention: { invites: 1, daily_counts: 2 },
            websites: { checked: 12, added: 1, failed: 0 },
          },
        },
        now,
      ),
    ).toEqual({
      state: "ok",
      ranAt: "2026-10-20T02:15:00Z",
      text: "checked 12 websites, 1 new event to the poster queue, 3 old records deleted",
    });
    expect(
      nightlyStatus(
        {
          ran_at: "2026-10-18T02:15:00Z",
          summary: { retention: null, websites: { failed: 2 } },
        },
        now,
      ),
    ).toMatchObject({
      state: "late",
      text: "checked 0 websites, 2 couldn't be saved, 0 new events to the poster queue, the clean-up failed",
    });
  });
});
