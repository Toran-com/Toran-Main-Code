import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readInline, readLegal, todoCount } from "@/lib/legal-text";
import { site } from "@/lib/site";

const doc = (name: string) =>
  readLegal(
    readFileSync(path.join(process.cwd(), "docs", "legal", name), "utf8"),
  );

describe("readInline", () => {
  it("reads bold, links and text still to fill in", () => {
    expect(
      readInline(
        "Run by **[Company name] Ltd**. See [ICO](https://ico.org.uk).",
      ),
    ).toEqual([
      { kind: "text", text: "Run by " },
      {
        kind: "bold",
        children: [
          { kind: "todo", text: "Company name" },
          { kind: "text", text: " Ltd" },
        ],
      },
      { kind: "text", text: ". See " },
      {
        kind: "link",
        href: "https://ico.org.uk",
        children: [{ kind: "text", text: "ICO" }],
      },
      { kind: "text", text: "." },
    ]);
  });

  it("turns links between the documents into links between the pages", () => {
    expect(readInline("our [terms](terms.md)")[1]).toMatchObject({
      kind: "link",
      href: "/terms",
    });
    // Internal documents aren't on the site: just the words.
    expect(readInline("the [schedule](retention.md)")).toEqual([
      { kind: "text", text: "the " },
      { kind: "text", text: "schedule" },
    ]);
  });

  it("never makes a link to anything but a web page", () => {
    expect(readInline("[click](javascript:alert(1))")[0]).not.toMatchObject({
      kind: "link",
    });
  });
});

describe("readLegal", () => {
  it("reads headings, paragraphs, lists and tables, without the title and draft note", () => {
    const blocks = readLegal(`# Title (DRAFT)

> Draft for review.

## The short version

- One
- Two, which carries
  on here

A paragraph
over two lines.

| What | Why |
| ---- | --- |
| Email | Logging in |
`);
    expect(blocks.map((b) => b.kind)).toEqual([
      "heading",
      "list",
      "paragraph",
      "table",
    ]);
    expect(blocks[0]).toMatchObject({ level: 2, id: "the-short-version" });
    expect(blocks[1]).toMatchObject({
      items: [
        [{ kind: "text", text: "One" }],
        [{ kind: "text", text: "Two, which carries on here" }],
      ],
    });
    expect(blocks[2]).toMatchObject({
      children: [{ kind: "text", text: "A paragraph over two lines." }],
    });
    expect(blocks[3]).toMatchObject({
      header: [
        [{ kind: "text", text: "What" }],
        [{ kind: "text", text: "Why" }],
      ],
      rows: [
        [
          [{ kind: "text", text: "Email" }],
          [{ kind: "text", text: "Logging in" }],
        ],
      ],
    });
  });

  it.each(["privacy-notice.md", "terms.md"])(
    "reads the whole of %s with no Markdown left over",
    (name) => {
      const blocks = doc(name);
      expect(blocks.length).toBeGreaterThan(10);
      expect(JSON.stringify(blocks)).not.toMatch(/\*\*|\]\(|^#|"text":"#/);
    },
  );

  it("is marked as a draft while any [bracket] is left to fill in", () => {
    const left =
      todoCount(doc("privacy-notice.md")) + todoCount(doc("terms.md"));
    if (site.legalChecked) expect(left).toBe(0);
    else expect(left).toBeGreaterThan(0);
  });
});
