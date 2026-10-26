import { expect, test } from "@playwright/test";

// Following a mandir without an account: kept on the phone, and What's on
// can show only the mandirs followed. Which events are listed depends on
// what other tests saved, so this checks the shape, not the count.
const SLUG = "geeta-bhavan-leicester";
const NAME = "Geeta Bhavan Leicester";

test("follow a mandir on this phone, then see only its events", async ({
  page,
}) => {
  await page.goto(`/mandirs/${SLUG}`);
  const follow = page.getByRole("button", { name: "Follow", exact: true });
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  await follow.click();
  const following = page.getByRole("button", { name: "Following" });
  await expect(following).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Saved on this phone only")).toBeVisible();

  // Still followed next time.
  await page.reload();
  await expect(following).toHaveAttribute("aria-pressed", "true");

  // What's on offers the mandirs followed.
  await page.goto("/whats-on?type=festival");
  const only = page.getByRole("link", { name: "Only mandirs I follow (1)" });
  await only.click();
  await expect(page).toHaveURL(new RegExp(`mandirs=${SLUG}`));
  await expect(page).toHaveURL(/type=festival/);
  for (const event of await page.getByRole("article").all()) {
    await expect(event).toContainText(NAME);
  }
  // A chosen filter, which can be taken off.
  await page.getByRole("link", { name: "Remove Mandirs you follow" }).click();
  await expect(page).not.toHaveURL(/mandirs=/);
  await expect(only).toBeVisible();

  // Unfollowing takes it away.
  await page.goto(`/mandirs/${SLUG}`);
  await following.click();
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  await page.goto("/whats-on");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(only).toHaveCount(0);
});
