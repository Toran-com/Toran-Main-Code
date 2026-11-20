import { expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const DB_URL =
  process.env.DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// The newest login link sent to an address, read from Supabase's local test
// mailbox (Mailpit). Waits up to 15 seconds for it to arrive.
export async function latestLoginLink(email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = await (
      await fetch(
        `${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(email)}`,
      )
    ).json();
    const first = list.messages?.[0];
    if (first) {
      const message = await (
        await fetch(`${MAILPIT}/api/v1/message/${first.ID}`)
      ).json();
      const match =
        String(message.HTML ?? message.Text).match(/href="([^"]+)"/) ??
        String(message.Text).match(/(https?:\/\/\S+verify\S+)/);
      if (match) return match[1].replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No login email arrived for ${email}`);
}

// The code in the newest login email to an address.
export async function latestLoginCode(email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = await (
      await fetch(
        `${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(email)}`,
      )
    ).json();
    const first = list.messages?.[0];
    if (first) {
      const message = await (
        await fetch(`${MAILPIT}/api/v1/message/${first.ID}`)
      ).json();
      const match = String(message.HTML ?? "").match(/>\s*(\d{6,10})\s*</);
      if (match) return match[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No login code arrived for ${email}`);
}

// Opens a login email's link, then presses "Log in" on the page it leads
// to (the link alone logs nobody in: app/(public)/login/confirm), and waits
// until it's done: logged in and on the next page, or turned back.
export async function followLoginLink(page: Page, link: string) {
  await page.goto(link);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL((url) => url.pathname !== "/login/confirm");
  // The address changes as soon as the next page starts drawing; its
  // title comes a moment later. Wait for it, so checks that follow (such
  // as accessibility, which needs the title) see the whole page.
  await expect(page).toHaveTitle(/\S/);
}

export function sql(query: string): string {
  return execFileSync("psql", [DB_URL, "-qtA", "-c", query]).toString().trim();
}

// A 6-digit authenticator code (RFC 6238, SHA-1, 30 seconds) for a base32 key.
export function totp(secret: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return value.toString().padStart(6, "0");
}

// Logs in by email link, ending on `next`.
export async function logIn(page: Page, email: string, next = "/account") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a login link" }).click();
  await expect(
    page.getByText("Check your email for a login link"),
  ).toBeVisible();
  await followLoginLink(page, await latestLoginLink(email));
}

// Makes a fresh login a Toran admin with an authenticator app, unlocked.
export async function logInAsAdmin(page: Page, email: string) {
  await logIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  sql(
    `insert into public.toran_admins (user_id, note) select id, 'e2e' from auth.users where email = '${email}'`,
  );
  await page.goto("/ops");
  await page
    .getByRole("button", { name: "Set up an authenticator app" })
    .click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Confirm and unlock admin" }).click();
  await expect(page.getByText("Unlocked.")).toBeVisible();
}

// Goes to one of the admin tools from the admin menu: in the side bar on a
// laptop, behind "Admin menu" on a phone. A count beside a tool ("Needs
// attention, 3 waiting") is allowed for.
export async function openAdminTool(page: Page, name: string) {
  const menu = page.locator("summary", { hasText: "Admin menu" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Admin" })
    .getByRole("link", { name: new RegExp(`^${name}(\\s*,|$)`) })
    .click();
}

// The maps' streets come from OpenFreeMap, drawn in the browser, or else
// OpenStreetMap's pictures (decision 0019). Tests never call either:
// OpenFreeMap answers that it's unavailable, so the map falls back to
// the pictures, and every picture is blank.
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

export async function stubMapTiles(page: Page) {
  await page
    .context()
    .route("https://tiles.openfreemap.org/**", (route) =>
      route.fulfill({ status: 503, body: "" }),
    );
  await page
    .context()
    .route("https://tile.openstreetmap.org/**", (route) =>
      route.fulfill({ body: BLANK_PNG, contentType: "image/png" }),
    );
}

// The map is the default view of /mandirs once mandirs have map positions
// (saving a mandir in /ops looks its position up), so tests of the list
// switch to it first.
export async function showMandirList(page: Page) {
  const list = page.getByRole("button", { name: "List", exact: true });
  await list.click();
  await expect(list).toHaveAttribute("aria-pressed", "true");
}

// On a committee's page: opens "Add events" and chooses a way to add them
// ("Type it in", "Tick festivals"…), which opens in a sheet.
export async function addEventsBy(page: Page, way: string) {
  await page.getByRole("button", { name: "Add events", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Add events" })
    .getByRole("button", { name: new RegExp(`^${escape(way)}`) })
    .click();
  await expect(page.getByRole("dialog", { name: way })).toBeVisible();
}

// On a committee's page: opens the sheet of things to do with one of the
// events coming up (Still on, Cancel, Duplicate, Add seva, Remove).
export async function eventMenu(page: Page, title: string) {
  await page
    .getByRole("button", { name: new RegExp(`^More for ${escape(title)}`) })
    .first()
    .click();
  const sheet = page.locator("dialog[open]");
  await expect(sheet).toBeVisible();
  return sheet;
}

// On a committee's page: opens one of "Your mandir" (Committee, Photo,
// Details, Your calendar, Recent changes).
export async function mandirSetting(page: Page, name: string) {
  await page
    .getByRole("region", { name: "Your mandir" })
    .getByRole("button", { name: new RegExp(`^${escape(name)}`) })
    .click();
  const sheet = page.locator("dialog[open]");
  await expect(sheet).toBeVisible();
  return sheet;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
