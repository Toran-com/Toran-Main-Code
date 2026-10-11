import { describe, expect, it } from "vitest";
import { checkHealth } from "@/lib/health";

const now = new Date("2026-10-11T12:00:00Z");
const answering = (data: unknown, error: unknown = null) => ({
  rpc: async () => ({ data, error }),
});

describe("checkHealth", () => {
  it("is ok when the database answers ok", async () => {
    expect(await checkHealth(answering("ok"), now)).toEqual({
      status: "ok",
      database: "ok",
      checkedAt: "2026-10-11T12:00:00.000Z",
    });
  });

  it("says when the database is not connected or misconfigured", async () => {
    expect((await checkHealth(null, now)).database).toBe("not configured");
    expect((await checkHealth("misconfigured", now)).database).toBe(
      "misconfigured",
    );
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

  it("gives up after the timeout", async () => {
    const hanging = { rpc: () => new Promise<never>(() => {}) };
    const health = await checkHealth(hanging, now, 20);
    expect(health.database).toBe("unreachable");
  });
});
