// The privacy notice and terms are written in Markdown in docs/legal, so
// the founders (and a solicitor) can edit one copy. This reads the small
// part of Markdown those files use into plain blocks for the site to show:
// headings, paragraphs, bullet lists, tables, **bold**, [links](…) and
// [text still to fill in]. Pure, so it is tested on its own.

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; children: Inline[] }
  | { kind: "link"; href: string; children: Inline[] }
  // Text in [square brackets] that still needs filling in or checking.
  | { kind: "todo"; text: string };

export type Block =
  | { kind: "heading"; level: 2 | 3; id: string; children: Inline[] }
  | { kind: "paragraph"; children: Inline[] }
  | { kind: "list"; items: Inline[][] }
  | { kind: "table"; header: Inline[][]; rows: Inline[][][] };

// Links between the documents become links between the pages. Links to
// the internal ones (the retention schedule, the DPIA) become plain text.
const PAGES: Record<string, string | null> = {
  "privacy-notice.md": "/privacy",
  "terms.md": "/terms",
  "retention.md": null,
  "dpia.md": null,
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function readInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\[([^\]]+)\](?!\()/g;
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last)
      out.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      out.push({ kind: "bold", children: readInline(m[1]) });
    } else if (m[2] !== undefined) {
      const href = m[3];
      const page = href in PAGES ? PAGES[href] : href;
      const children = readInline(m[2]);
      if (page && /^(https?:\/\/|\/|mailto:)/.test(page)) {
        out.push({ kind: "link", href: page, children });
      } else {
        out.push(...children);
      }
    } else {
      out.push({ kind: "todo", text: m[4] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => readInline(c.trim()));

// The document's blocks, without its "# Title" and the draft note under it
// (the page shows its own title and draft notice).
export function readLegal(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /^# /.test(line) || /^>/.test(line)) {
      i++;
    } else if (/^#{2,3} /.test(line)) {
      const level = line.startsWith("### ") ? 3 : 2;
      const text = line.replace(/^#+ /, "").trim();
      blocks.push({
        kind: "heading",
        level,
        id: slugify(text),
        children: readInline(text),
      });
      i++;
    } else if (/^\|/.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const [header, , ...body] = rows;
      blocks.push({
        kind: "table",
        header: cells(header),
        rows: body.map(cells),
      });
    } else if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(- |  \S)/.test(lines[i])) {
        if (lines[i].startsWith("- ")) items.push(lines[i].slice(2).trim());
        else items[items.length - 1] += ` ${lines[i].trim()}`;
        i++;
      }
      blocks.push({ kind: "list", items: items.map(readInline) });
    } else {
      const words: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(#|\||- |>)/.test(lines[i])
      ) {
        words.push(lines[i++].trim());
      }
      blocks.push({ kind: "paragraph", children: readInline(words.join(" ")) });
    }
  }
  return blocks;
}

// How many [bits] still need filling in, for the draft notice.
export function todoCount(blocks: Block[]): number {
  const count = (inline: Inline[]): number =>
    inline.reduce(
      (n, x) =>
        n + (x.kind === "todo" ? 1 : x.kind === "text" ? 0 : count(x.children)),
      0,
    );
  return blocks.reduce((n, b) => {
    if (b.kind === "list") return n + b.items.reduce((m, i) => m + count(i), 0);
    if (b.kind === "table") {
      return (
        n +
        [b.header, ...b.rows].reduce(
          (m, row) => m + row.reduce((k, c) => k + count(c), 0),
          0,
        )
      );
    }
    return n + count(b.children);
  }, 0);
}
