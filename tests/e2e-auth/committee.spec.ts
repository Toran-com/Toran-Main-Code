import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// A committee member invites a colleague, who accepts on their account
// page; then people are taken off and the first member leaves. Uses a
// mandir no other test looks at.
const SLUG = "chelmsford-hindu-society";
const NAME = "Chelmsford Hindu Society";

test("invite a colleague, who accepts; remove and leave", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const first = await browser.newPage();
  const colleague = await browser.newPage();
  first.on("dialog", (dialog) => dialog.accept());
  const firstEmail = `first-${Date.now()}@example.com`;
  const colleagueEmail = `colleague-${Date.now()}@example.com`;

  await logIn(first, firstEmail);
  sql(
    `insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${firstEmail}'`,
  );
  sql(`update public.mandirs set status = 'claimed' where slug = '${SLUG}'`);

  // Invite, with capitals the database tidies.
  await first.goto(`/manage/${SLUG}`);
  // The committee part folds away until it's wanted.
  await first.getByText("Your committee on Toran").click();
  await first
    .getByLabel("Their email address")
    .fill(colleagueEmail.toUpperCase());
  await first.getByRole("button", { name: "Invite", exact: true }).click();
  await expect(first.getByText(/^Invited\./)).toBeVisible();
  const waiting = first
    .getByRole("listitem")
    .filter({ hasText: colleagueEmail });
  await expect(waiting).toBeVisible();
  const whatsApp = await waiting
    .getByRole("link", { name: "Send on WhatsApp" })
    .getAttribute("href");
  expect(decodeURIComponent(whatsApp!)).toContain(
    `help run ${NAME}, Chelmsford on Toran. Log in with ${colleagueEmail}`,
  );

  // The colleague logs in with that address and accepts.
  await logIn(colleague, colleagueEmail);
  await expect(colleague).toHaveURL(/\/account$/);
  await expect(
    colleague.getByRole("heading", { name: `Help run ${NAME}, Chelmsford?` }),
  ).toBeVisible();
  await colleague.getByRole("button", { name: "Accept" }).click();
  await expect(colleague).toHaveURL(
    new RegExp(`/manage/${SLUG}\\?done=joined`),
  );
  await expect(colleague.getByText(/^Welcome\./)).toBeVisible();
  // They can't take off the person who invited them.
  const firstRow = colleague
    .getByRole("listitem")
    .filter({ hasText: firstEmail });
  await expect(firstRow).toBeVisible();
  await expect(firstRow.getByRole("button")).toHaveCount(0);
  await expect(
    colleague
      .getByRole("listitem")
      .filter({ hasText: colleagueEmail })
      .getByRole("button", { name: "Leave" }),
  ).toBeVisible();

  // The first member sees them, and can take them off.
  await first.reload();
  await first
    .getByRole("listitem")
    .filter({ hasText: colleagueEmail })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(first.getByText("Taken off your committee.")).toBeVisible();

  // An invite can be cancelled.
  await first.getByLabel("Their email address").fill("someone@example.com");
  await first.getByRole("button", { name: "Invite", exact: true }).click();
  await first
    .getByRole("listitem")
    .filter({ hasText: "someone@example.com" })
    .getByRole("button", { name: "Cancel invite" })
    .click();
  await expect(first.getByText("Invite cancelled.")).toBeVisible();

  // Leaving: the page can be claimed again.
  await first
    .getByRole("listitem")
    .filter({ hasText: firstEmail })
    .getByRole("button", { name: "Leave" })
    .click();
  await expect(first).toHaveURL(/\/account\?done=left$/);
  await expect(
    first.getByText("You no longer help run that mandir's page."),
  ).toBeVisible();
  expect(sql(`select status from public.mandirs where slug = '${SLUG}'`)).toBe(
    "listed",
  );
});
