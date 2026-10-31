import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { logInAsAdmin } from "./helpers";

// A photo of the mandir: added on its committee page, shown at the top of
// its public page, and taken off again. Uses a mandir no other test looks
// at.
const SLUG = "mandir-baba-balak-nath-walsall";
const NAME = "Mandir Baba Balak Nath";

test("a photo of the mandir goes on its page and comes off again", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await logInAsAdmin(page, `photo-${Date.now()}@example.com`);
  await page.goto(`/manage/${SLUG}`);
  await page.getByText("Photo of your mandir", { exact: true }).click();
  await page.getByLabel("Choose a photo").setInputFiles({
    name: "mandir.png",
    mimeType: "image/png",
    buffer: png(320, 180),
  });
  // Made smaller on this device first, and shown before it's sent.
  await expect(page.getByAltText("The photo you chose")).toBeVisible();
  await page.getByLabel(/It's a photo of the building/).check();
  await page.getByRole("button", { name: "Add the photo" }).click();
  await expect(
    page.getByText("Saved. Your photo is at the top of your public page."),
  ).toBeVisible();

  await page.goto(`/mandirs/${SLUG}`);
  const photo = page.getByAltText(`Photo of ${NAME}`);
  const src = await photo.getAttribute("src");
  expect(src).toMatch(
    /\/storage\/v1\/object\/public\/mandir-photos\/.+-640\.jpg$/,
  );
  const file = await page.request.get(src!);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("image/jpeg");

  await page.goto(`/manage/${SLUG}`);
  await page.getByText("Photo of your mandir", { exact: true }).click();
  await page.getByRole("button", { name: "Remove the photo" }).click();
  await expect(page.getByText("Photo removed from your page.")).toBeVisible();
  await page.goto(`/mandirs/${SLUG}`);
  await expect(page.getByAltText(`Photo of ${NAME}`)).toHaveCount(0);
  // The files are gone too.
  expect((await page.request.get(src!)).status()).not.toBe(200);
});

// A plain saffron PNG, made here so the test needs no image file.
function png(width: number, height: number): Buffer {
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.alloc(width * 3, Buffer.from([0xf2, 0x9b, 0x2c])),
  ]);
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(Array(height).fill(row)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
