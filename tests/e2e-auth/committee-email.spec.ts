import { expect, test } from "@playwright/test";
import { logInAsAdmin, openAdminTool, sql } from "./helpers";

// Toran previews the weekly email to a mandir's committee, which isn't
// sent until COMMITTEE_EMAIL is on (it isn't in tests), and can send one to
// themselves once an email sender is set up. Uses a mandir no other test
// looks at.
const SLUG = "medway-hindu-mandir-gillingham";

test("admins preview the weekly committee email before it's switched on", async ({
  page,
}) => {
  const email = `committee-email-${Date.now()}@example.com`;
  await logInAsAdmin(page, email);
  // The mandir has a committee on Toran (this admin, for the test).
  sql(
    `update public.mandirs set status = 'claimed' where slug = '${SLUG}';
     insert into public.mandir_admins (mandir_id, user_id)
       select m.id, u.id from public.mandirs m, auth.users u
       where m.slug = '${SLUG}' and u.email = '${email}'`,
  );

  await openAdminTool(page, "Committee email");
  await expect(page).toHaveURL(/\/ops\/committee-email$/);
  await expect(page.getByText(/^Not sending yet\./)).toBeVisible();
  await page
    .getByRole("combobox", { name: "Mandir with a committee" })
    .selectOption(SLUG);
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(new RegExp(`mandir=${SLUG}`));
  const preview = page.getByRole("region", { name: /your week on Toran$/ });
  // The email as committees see it, and its plain text.
  await expect(
    preview.getByTitle(/^The email as committees see it/),
  ).toBeVisible();
  await preview.getByText("The plain text version").click();
  await expect(preview).toContainText("Your week on Toran");
  await expect(preview).toContainText(`/manage/${SLUG}/numbers`);
  await expect(preview).toContainText(/follows? your mandir/);
  await expect(preview).toContainText(
    "To stop it: (a link just for each committee member)",
  );
  // No email sender in tests, so "Send this to me" says it couldn't.
  await preview.getByRole("button", { name: "Send this to me" }).click();
  await expect(
    page.getByText("It couldn't be sent: check the email sender"),
  ).toBeVisible();

  sql(
    `delete from public.mandir_admins where user_id =
       (select id from auth.users where email = '${email}');
     update public.mandirs set status = 'listed' where slug = '${SLUG}'`,
  );
});
