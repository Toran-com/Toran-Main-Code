export type DatabaseState =
  "ok" | "not configured" | "misconfigured" | "unreachable";

export type Health = {
  status: "ok" | "degraded";
  database: DatabaseState;
  checkedAt: string;
};

// Anything with Supabase's rpc() shape, so tests can pass a fake.
type RpcClient = {
  rpc: (fn: "health") => PromiseLike<{ data: unknown; error: unknown }>;
};

const TIMEOUT_MS = 3000;

export async function checkHealth(
  client: RpcClient | null | "misconfigured",
  now: Date = new Date(),
  timeoutMs: number = TIMEOUT_MS,
): Promise<Health> {
  const result = (database: DatabaseState): Health => ({
    status: database === "ok" ? "ok" : "degraded",
    database,
    checkedAt: now.toISOString(),
  });

  if (client === null) return result("not configured");
  if (client === "misconfigured") return result("misconfigured");

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  try {
    const answer = await Promise.race([client.rpc("health"), timeout]);
    if (answer === "timeout") return result("unreachable");
    return result(!answer.error && answer.data === "ok" ? "ok" : "unreachable");
  } catch {
    return result("unreachable");
  } finally {
    clearTimeout(timer);
  }
}
