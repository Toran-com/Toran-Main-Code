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
  await page.goto(await latestLoginLink(email));
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

// The mandirs map's pictures come from OpenStreetMap. Tests get a blank
// picture instead, so they never call OpenStreetMap or wait on it.
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

export async function stubMapTiles(page: Page) {
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
