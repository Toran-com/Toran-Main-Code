import { expect, test } from "@playwright/test";
import { logIn, logInAsAdmin } from "./helpers";

// A committee member claims a mandir, a Toran admin approves it, and the
// member adds an event that appears on the public page straight away.
// Uses a mandir no other test looks at.
const SLUG = "shree-krishna-temple-leicester";
const NAME = "Shree Krishna Temple";

// A date a week from now in London, as the date input wants it.
function nextWeek(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date(Date.now() + 7 * 86_400_000));
}

test("claim, approve, add an event, cancel it", async ({ browser }) => {
  test.setTimeout(120_000);
  const member = await browser.newPage();
  const admin = await browser.newPage();
  const memberEmail = `committee-${Date.now()}@example.com`;

  // The public page offers to look after it.
  await member.goto(`/mandirs/${SLUG}`);
  await expect(member.getByText("No events listed yet.")).toBeVisible();
  await member.getByRole("link", { name: "Look after this page" }).click();
  await expect(member).toHaveURL(/\/login\?next=/);

  // Claim it.
  await logIn(member, memberEmail, `/mandirs/${SLUG}/claim`);
  await expect(member).toHaveURL(new RegExp(`/mandirs/${SLUG}/claim$`));
  await member.getByLabel("Your role at the mandir").fill("Secretary");
  await member.getByLabel(/I'm on this mandir's committee/).check();
  await member.getByRole("button", { name: "Send request" }).click();
  await expect(member.getByText("We've got your request")).toBeVisible();

  // A Toran admin approves it.
  await logInAsAdmin(admin, `approver-${Date.now()}@example.com`);
  const claim = admin.getByRole("listitem").filter({ hasText: memberEmail });
  await expect(claim).toContainText(NAME);
  await expect(claim).toContainText("Secretary");
  await claim.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByText("Claim approved.")).toBeVisible();

  // The member now runs it and adds an event.
  await member.goto("/account");
  await member.getByRole("link", { name: new RegExp(NAME) }).click();
  await expect(member).toHaveURL(new RegExp(`/manage/${SLUG}$`));
  await member.getByLabel("What's happening?").fill("Annakut darshan");
  await member.getByLabel("What kind of event?").selectOption("festival");
  await member.getByLabel("Date").fill(nextWeek());
  await member.getByLabel("Starts").fill("18:30");
  await member
    .getByText("Add the name and description in Gujarati (optional)")
    .click();
  await member.getByLabel("Name in Gujarati").fill("અન્નકૂટ દર્શન");
  await member.getByLabel("Description in Gujarati").fill("સૌનું સ્વાગત છે.");
  await member.getByRole("button", { name: "Add event" }).click();
  await expect(member.getByText("Added.")).toBeVisible();

  // It's on the public page at once, with the committee badge and the
  // Gujarati under the English.
  await member.goto(`/mandirs/${SLUG}`);
  const event = member.getByRole("article").filter({ hasText: "Annakut" });
  await expect(event).toContainText("6:30pm");
  await expect(event.locator('[lang="gu"]').first()).toHaveText(
    "અન્નકૂટ દર્શન",
  );
  await expect(event).toContainText("સૌનું સ્વાગત છે.");
  await expect(event).toContainText("Festival");
  await expect(event).toContainText("Confirmed by the mandir");
  const whatsApp = await event
    .getByRole("link", { name: "WhatsApp" })
    .getAttribute("href");
  expect(decodeURIComponent(whatsApp!)).toContain(`Annakut darshan at ${NAME}`);
  await expect(member.getByText("Run by the mandir's committee")).toBeVisible();

  // And on What's on, under the mandir's name.
  await member.goto("/whats-on");
  const listed = member
    .getByRole("article")
    .filter({ hasText: "Annakut darshan" });
  await expect(listed).toContainText(NAME);
  await expect(listed).toContainText("અન્નકૂટ દર્શન");
  await expect(listed).toContainText("Festival · Confirmed by the mandir");
  // Choosing a type of event narrows the list.
  await member.goto("/whats-on?type=festival");
  await expect(
    member.getByRole("article").filter({ hasText: "Annakut darshan" }),
  ).toHaveCount(1);
  await member.goto("/whats-on?type=class");
  await expect(
    member.getByRole("article").filter({ hasText: "Annakut darshan" }),
  ).toHaveCount(0);

  // A weekly event shows once, with its next date.
  await member.goto(`/manage/${SLUG}`);
  await member.getByLabel("What's happening?").fill("Weekly aarti");
  await member.getByLabel("Date").fill(nextWeek());
  await member.getByLabel("Starts").fill("19:00");
  await member
    .getByRole("combobox", { name: /^Repeats/ })
    .selectOption("weekly");
  await member.getByRole("button", { name: "Add event" }).click();
  await expect(member.getByText("Added.")).toBeVisible();
  await expect(
    member.getByRole("listitem").filter({ hasText: "Weekly aarti" }),
  ).toContainText(/Every \w+day · next/);
  await member.goto(`/mandirs/${SLUG}`);
  const weekly = member
    .getByRole("article")
    .filter({ hasText: "Weekly aarti" });
  await expect(weekly).toHaveCount(1);
  await expect(weekly).toContainText(/Every \w+day · next .*7pm/);

  // The committee edits it: the form starts with its details filled in.
  await member.goto(`/manage/${SLUG}`);
  await member
    .getByRole("listitem")
    .filter({ hasText: "Weekly aarti" })
    .getByRole("link", { name: "Edit" })
    .click();
  await expect(member).toHaveURL(new RegExp(`/manage/${SLUG}/events/`));
  // The committee's page stays in the document, hidden, after moving on
  // (Next.js keeps it for going back), so look only inside the edit form.
  const form = member
    .locator("form")
    .filter({ has: member.getByRole("button", { name: "Save changes" }) });
  await expect(form.getByLabel("What's happening?")).toHaveValue(
    "Weekly aarti",
  );
  await expect(form.getByLabel("Starts")).toHaveValue("19:00");
  await expect(form.getByRole("combobox", { name: /^Repeats/ })).toHaveValue(
    "weekly",
  );
  await form.getByLabel("What's happening?").fill("Weekly sandhya aarti");
  await form.getByLabel("Starts").fill("19:30");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(member.getByText("Saved. Your public page shows")).toBeVisible();
  await member.goto(`/mandirs/${SLUG}`);
  const edited = member
    .getByRole("article")
    .filter({ hasText: "Weekly sandhya aarti" });
  await expect(edited).toHaveCount(1);
  await expect(edited).toContainText(/Every \w+day · next .*7:30pm/);
  await expect(edited).toContainText("Confirmed by the mandir");

  // Cancelling shows on the public page too.
  await member.goto(`/manage/${SLUG}`);
  await member
    .getByRole("listitem")
    .filter({ hasText: "Annakut darshan" })
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(member.getByText("Marked as cancelled")).toBeVisible();
  await member.goto(`/mandirs/${SLUG}`);
  await expect(
    member.getByRole("article").filter({ hasText: "Annakut" }),
  ).toContainText("Cancelled");

  // The committee corrects its own details.
  await member.goto(`/manage/${SLUG}`);
  await member
    .getByLabel("Website")
    .fill("krishnatemple-leicester.example.org");
  await member.getByLabel("Mandir phone number").fill("0116 000 0000");
  await member.getByRole("button", { name: "Save details" }).click();
  await expect(member.getByText("Saved. Your public page")).toBeVisible();
  await member.goto(`/mandirs/${SLUG}`);
  await expect(
    member
      .getByRole("link", { name: "krishnatemple-leicester.example.org" })
      .first(),
  ).toBeVisible();
  await expect(member.getByText("0116 000 0000")).toBeVisible();

  // Toran types up a poster someone forwarded; the committee publishes it.
  await admin.goto("/ops/posters");
  await admin.getByRole("combobox", { name: /^Mandir/ }).selectOption(SLUG);
  await admin.getByLabel("What's happening?").fill("Sharad Purnima garba");
  await admin.getByLabel("Date").fill(nextWeek());
  await admin.getByLabel("Starts").fill("20:00");
  await admin.getByRole("button", { name: "Add to the queue" }).click();
  await expect(admin.getByText("Added to the queue.")).toBeVisible();
  const queued = admin
    .getByRole("listitem")
    .filter({ hasText: "Sharad Purnima garba" });
  await expect(queued).toContainText("Waiting for the committee");
  await expect(queued.getByRole("button", { name: "Publish" })).toHaveCount(0);

  await member.goto(`/manage/${SLUG}`);
  await expect(member.getByText("Posters waiting for you")).toBeVisible();
  await member
    .getByRole("listitem")
    .filter({ hasText: "Sharad Purnima garba" })
    .getByRole("button", { name: "Publish" })
    .click();
  await expect(
    member.getByText("Published. It's on your public page"),
  ).toBeVisible();
  await expect(member.getByText("Posters waiting for you")).toHaveCount(0);
  await member.goto(`/mandirs/${SLUG}`);
  await expect(
    member.getByRole("article").filter({ hasText: "Sharad Purnima garba" }),
  ).toContainText("Confirmed by the mandir");

  // Removing an event asks first.
  await member.goto(`/manage/${SLUG}`);
  let asked = "";
  member.once("dialog", (dialog) => {
    asked = dialog.message();
    void dialog.accept();
  });
  await member
    .getByRole("listitem")
    .filter({ hasText: "Annakut darshan" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(member.getByText("Removed from your page.")).toBeVisible();
  expect(asked).toContain("Annakut darshan");
});

test("someone who doesn't run a mandir can't manage it", async ({ page }) => {
  await logIn(page, `outsider-${Date.now()}@example.com`, `/manage/${SLUG}`);
  await expect(page.getByText("This page could not be found")).toBeVisible();
});
