"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { ScanResult } from "@/app/(ops)/ops/websites/actions";
import { buttonClass, pillButtonClass } from "@/components/ui";

// /ops/websites: tick the mandirs to scan, then scan them all. Each is
// scanned in turn (one call each, so slow sites can't run the page out of
// time), with what was found shown as it goes. The tick boxes are in the
// list on the page (form="website-scan"); this is the panel above it.

const FORM = "website-scan";
const boxes = () => [
  ...document.querySelectorAll<HTMLInputElement>(
    `input[form="${FORM}"][name="scan"]`,
  ),
];

export function WebsiteScan({
  names,
  reading,
  scan,
}: {
  // Each mandir's name, by its page address.
  names: Record<string, string>;
  // Whether found patrikas can be read with Claude.
  reading: boolean;
  scan: (slug: string, readPatrikas: boolean) => Promise<ScanResult>;
}) {
  const router = useRouter();
  const [ticked, setTicked] = useState(0);
  const [running, setRunning] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<ScanResult[]>([]);

  // Counts the ticks as they change, wherever they are on the page.
  useEffect(() => {
    const count = () => setTicked(boxes().filter((b) => b.checked).length);
    document.addEventListener("change", count);
    return () => document.removeEventListener("change", count);
  }, []);

  function tick(which: (box: HTMLInputElement) => boolean) {
    for (const box of boxes()) box.checked = which(box);
    setTicked(boxes().filter((b) => b.checked).length);
  }

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const read = new FormData(event.currentTarget).get("read") === "yes";
    const slugs = boxes()
      .filter((b) => b.checked)
      .map((b) => b.value);
    if (!slugs.length) return;
    setResults([]);
    setTotal(slugs.length);
    for (const slug of slugs) {
      setRunning(slug);
      let result: ScanResult;
      try {
        result = await scan(slug, read);
      } catch {
        result = {
          slug,
          outcome: "failed",
          found: 0,
          added: 0,
          read: 0,
          readAdded: 0,
          waitsFor: "toran",
        };
      }
      setResults((done) => [...done, result]);
    }
    setRunning(null);
    tick(() => false);
    router.refresh();
  }

  const added = (r: ScanResult) => r.added + r.readAdded;
  const forCommittees = results
    .filter((r) => r.waitsFor === "committee")
    .reduce((n, r) => n + added(r), 0);
  const forToran = results
    .filter((r) => r.waitsFor === "toran")
    .reduce((n, r) => n + added(r), 0);

  return (
    <form id={FORM} onSubmit={start} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted text-base">Tick:</span>
        <button
          type="button"
          className={pillButtonClass}
          onClick={() => tick(() => true)}
        >
          All
        </button>
        <button
          type="button"
          className={pillButtonClass}
          onClick={() => tick((b) => b.dataset.never === "1")}
        >
          Never checked
        </button>
        <button
          type="button"
          className={pillButtonClass}
          onClick={() => tick(() => false)}
        >
          None
        </button>
      </div>
      {reading && (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="read"
            value="yes"
            defaultChecked
            className="accent-peacock mt-1 size-5 shrink-0"
          />
          <span>
            Also read the patrikas and posters each site links to with Claude
            (up to two new ones per site)
          </span>
        </label>
      )}
      <button
        type="submit"
        disabled={!!running || ticked === 0}
        className={buttonClass}
      >
        {running
          ? `Scanning ${results.length + 1} of ${total}…`
          : `Scan the ticked websites (${ticked})`}
      </button>
      <p className="text-muted text-base">
        New events go to each mandir&apos;s own page for its committee to check
        and publish, or to the{" "}
        <Link href="/ops/posters" className="text-peacock underline">
          review queue
        </Link>{" "}
        when it has no committee. Nothing is published by itself.
      </p>

      {(running || results.length > 0) && (
        <div
          role="status"
          className="bg-sunk flex flex-col gap-2 rounded-2xl p-4"
        >
          {!running && (
            <p className="font-semibold">
              Scanned {results.length}{" "}
              {results.length === 1 ? "website" : "websites"}.{" "}
              {forCommittees + forToran === 0
                ? "Nothing new."
                : `${forCommittees + forToran} new: ${forCommittees} waiting on committees' pages, ${forToran} in the review queue.`}
            </p>
          )}
          <ul className="flex flex-col gap-1 text-base">
            {results.map((r) => (
              <li key={r.slug}>
                <span className="font-semibold">{names[r.slug] ?? r.slug}</span>
                : {describe(r)}
              </li>
            ))}
            {running && (
              <li className="text-muted">
                Scanning {names[running] ?? running}…
              </li>
            )}
          </ul>
        </div>
      )}
    </form>
  );
}

function describe(r: ScanResult): string {
  const where =
    r.waitsFor === "committee"
      ? "waiting on the committee's page"
      : "in the review queue";
  const parts: string[] = [];
  if (r.outcome === "failed") return "something went wrong. Try it again.";
  if (r.outcome === "unreachable") parts.push("couldn't reach the site");
  else if (r.outcome === "blocked") parts.push("the site asks not to be read");
  else if (r.outcome === "none") parts.push("no readable events");
  else
    parts.push(
      `${r.found} ${r.found === 1 ? "event" : "events"} found, ${r.added} new`,
    );
  if (r.read) {
    parts.push(
      `read ${r.read} ${r.read === 1 ? "patrika" : "patrikas"}: ${r.readAdded} new`,
    );
  }
  const total = r.added + r.readAdded;
  return `${parts.join("; ")}${total ? `, ${where}` : ""}.`;
}
