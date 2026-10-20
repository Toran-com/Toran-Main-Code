import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/public-shell";
import { Notice } from "@/components/ui";
import {
  type Block,
  type Inline,
  readLegal,
  todoCount,
} from "@/lib/legal-text";
import { site } from "@/lib/site";

// The privacy notice and terms, shown from their Markdown in docs/legal so
// there is only one copy to keep right. Read when the site is built.
export type LegalDocument = "privacy-notice" | "terms";

export async function legalBlocks(doc: LegalDocument): Promise<Block[]> {
  "use cache";
  cacheLife("max");
  const file = path.join(process.cwd(), "docs", "legal", `${doc}.md`);
  return readLegal(await readFile(file, "utf8"));
}

export async function LegalPage({
  doc,
  title,
  intro,
}: {
  doc: LegalDocument;
  title: string;
  intro: string;
}) {
  const blocks = await legalBlocks(doc);
  const todo = todoCount(blocks);
  return (
    <>
      <PageHeading title={title} intro={intro} />
      {!site.legalChecked && (
        <Notice>
          This is a draft. Toran opens in 2027, and this text is being checked
          before then.
          {todo > 0 && (
            <>
              {" "}
              <mark className="bg-marigold/25 text-ink rounded px-1">
                Highlighted
              </mark>{" "}
              parts are still to be filled in.
            </>
          )}
        </Notice>
      )}
      <article className="legal flex flex-col gap-4">
        {blocks.map((block, i) => (
          <LegalBlock key={i} block={block} />
        ))}
      </article>
    </>
  );
}

function LegalBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading":
      return block.level === 2 ? (
        <h2
          id={block.id}
          className="font-display mt-4 scroll-mt-24 text-2xl font-bold"
        >
          <Inlines items={block.children} />
        </h2>
      ) : (
        <h3 id={block.id} className="mt-2 scroll-mt-24 text-xl font-bold">
          <Inlines items={block.children} />
        </h3>
      );
    case "paragraph":
      return (
        <p className="max-w-prose">
          <Inlines items={block.children} />
        </p>
      );
    case "list":
      return (
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-6">
          {block.items.map((item, i) => (
            <li key={i}>
              <Inlines items={item} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        // Scrolls sideways on a phone, so it can take keyboard focus.
        <div
          role="region"
          aria-label={`Table: ${block.header.map(plain).join(", ")}`}
          tabIndex={0}
          className="border-line focus:outline-peacock overflow-x-auto rounded-xl border focus:outline-2"
        >
          <table className="w-full min-w-xl text-left text-base">
            <thead className="bg-sunk">
              <tr>
                {block.header.map((cell, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-semibold">
                    <Inlines items={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i} className="px-3 py-2 align-top">
                      <Inlines items={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function Inlines({ items }: { items: Inline[] }): ReactNode {
  return items.map((item, i) => {
    switch (item.kind) {
      case "text":
        return item.text;
      case "bold":
        return (
          <strong key={i}>
            <Inlines items={item.children} />
          </strong>
        );
      case "todo":
        return (
          <mark key={i} className="bg-marigold/25 text-ink rounded px-1">
            {item.text}
          </mark>
        );
      case "link":
        return item.href.startsWith("/") ? (
          <Link key={i} href={item.href} className="text-peacock underline">
            <Inlines items={item.children} />
          </Link>
        ) : (
          <a
            key={i}
            href={item.href}
            className="text-peacock underline"
            rel="noopener noreferrer"
          >
            <Inlines items={item.children} />
          </a>
        );
    }
  });
}

function plain(items: Inline[]): string {
  return items
    .map((i) =>
      i.kind === "text" || i.kind === "todo" ? i.text : plain(i.children),
    )
    .join("");
}
