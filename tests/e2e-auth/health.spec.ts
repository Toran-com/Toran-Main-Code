import { expect, test } from "@playwright/test";
import { sql } from "./helpers";

// With the database connected, the health check also says how Toran's own
// jobs are doing, for the hourly uptime check (.github/workflows/uptime.yml).
test("health check says whether the nightly job is running", async ({
  request,
}) => {
  const health = async () => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    return response.json();
  };

  sql("delete from public.job_runs where job = 'nightly'");
  expect(await health()).toMatchObject({
    status: "ok",
    database: "ok",
    jobs: { nightly: "never", weekly: "off" },
  });

  sql(`insert into public.job_runs (job, ran_at, summary)
       values ('nightly', now() - interval '2 days', '{"retention": {}}')`);
  expect((await health()).jobs.nightly).toBe("late");

  sql(`insert into public.job_runs (job, summary)
       values ('nightly', '{"retention": {"invites": 0}}')`);
  expect((await health()).jobs.nightly).toBe("ok");
});
