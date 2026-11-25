import { expect, test } from "@playwright/test";

// The monthly committee email's stop link: a link that isn't complete, or
// made up, is turned away, and an email program's one-click unsubscribe
// always gets an answer. (A real link stops it: tests/unit and the
// database tests.)
test("a committee email stop link that isn't real is turned away", async ({
  page,
  request,
}) => {
  const fake =
    "/committee-email/stop?u=aaaaaaaa-0000-4000-8000-000000000001&m=10000000-0000-4000-8000-000000000001&c=madeup";
  for (const path of ["/committee-email/stop", fake]) {
    await page.goto(path);
    await expect(
      page.getByText(
        "This link isn't complete. Use the link at the bottom of the email.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Stop the monthly email" }),
    ).toHaveCount(0);
  }
  const oneClick = await request.post(`/api/${fake.slice(1)}`);
  expect(oneClick.status()).toBe(200);
});

// The seva emails' stop link (?k=seva) says which email it's about, and
// turns away a link that isn't real in the same way.
test("a seva email stop link says so, and isn't real without its code", async ({
  page,
  request,
}) => {
  const fake =
    "/committee-email/stop?u=aaaaaaaa-0000-4000-8000-000000000001&m=10000000-0000-4000-8000-000000000001&c=madeup&k=seva";
  await page.goto(fake);
  await expect(
    page.getByRole("heading", { name: "Seva emails about your mandir" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This link isn't complete. Use the link at the bottom of the email.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Stop the seva emails" }),
  ).toHaveCount(0);
  const oneClick = await request.post(`/api/${fake.slice(1)}`);
  expect(oneClick.status()).toBe(200);
});
