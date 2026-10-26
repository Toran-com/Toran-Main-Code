"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ImportState } from "@/app/(ops)/ops/mandirs/actions";
import { Badge } from "@/components/public-shell";
import {
  buttonClass,
  inputClass,
  Notice,
  quietButtonClass,
} from "@/components/ui";
import { IMPORT_PROBLEMS, MANDIR_IMPORT_COLUMNS } from "@/lib/mandir-import";

// Pasting many mandirs at once: check first, then add the new ones. The
// rows stay in the box, so they can be fixed and checked again.

const BECAUSE = {
  postcode: "same postcode as",
  website: "same website as",
  phone: "same phone number as",
  name: "a very similar name to",
};

export function MandirImport({
  action,
}: {
  action: (state: ImportState, form: FormData) => Promise<ImportState>;
}) {
  const [state, run, pending] = useActionState(action, {
    checked: [],
    added: [],
  });
  const [rows, setRows] = useState("");
  const fresh = state.checked.filter((c) => c.status === "new").length;
  const added = new Map(state.added.map((a) => [a.line, a.slug]));

  return (
    <form action={run} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Rows</span>
        <span className="text-muted text-base">
          Copy them from a spreadsheet, one mandir a row, with these columns in
          this order (a header row is fine):{" "}
          <code>{MANDIR_IMPORT_COLUMNS.join(", ")}</code>. Website, phone and
          tradition can be empty. Public details only: no committee
          members&apos; names or mobile numbers.
        </span>
        <textarea
          name="rows"
          rows={8}
          value={rows}
          onChange={(e) => setRows(e.target.value)}
          className={`${inputClass} font-mono text-base`}
          required
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="mode"
          value="check"
          disabled={pending}
          className={`${quietButtonClass} w-auto`}
        >
          Check
        </button>
        {fresh > 0 && !state.added.length && (
          <button
            type="submit"
            name="mode"
            value="add"
            disabled={pending}
            className={`${buttonClass} w-auto`}
          >
            Add the {fresh} new {fresh === 1 ? "mandir" : "mandirs"}
          </button>
        )}
      </div>

      <div aria-live="polite" className="flex flex-col gap-3">
        {state.error && (
          <Notice tone="error">Something went wrong. Please try again.</Notice>
        )}
        {state.added.length > 0 && (
          <Notice tone="success">
            Added {state.added.length}{" "}
            {state.added.length === 1 ? "mandir" : "mandirs"}, with map
            positions where the postcode was found. Possible duplicates and rows
            with problems weren&apos;t added: fix or remove them, then check
            again.
          </Notice>
        )}
        {state.checked.length > 0 && (
          <ul className="border-line bg-surface divide-line flex flex-col divide-y rounded-2xl border">
            {state.checked.map((c) => (
              <li
                key={c.line}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3"
              >
                <span className="text-muted tabular-nums">Line {c.line}</span>
                {c.status === "problem" ? (
                  <>
                    <span className="font-mono text-base break-all">
                      {c.text}
                    </span>
                    <Badge tone="kumkum">
                      {IMPORT_PROBLEMS[c.problem] ?? c.problem}
                    </Badge>
                  </>
                ) : (
                  <>
                    <span className="font-semibold">
                      {c.values.name}, {c.values.town}
                    </span>
                    <span className="text-muted">
                      {c.values.region}
                      {c.values.postcode && ` · ${c.values.postcode}`}
                    </span>
                    {added.has(c.line) ? (
                      <Link
                        href={`/ops/mandirs/${added.get(c.line)}`}
                        className="text-peacock font-semibold underline"
                      >
                        Added
                      </Link>
                    ) : c.status === "new" ? (
                      <Badge tone="leaf">New</Badge>
                    ) : (
                      <Badge tone="marigold">
                        Possible duplicate: {BECAUSE[c.because]} {c.like}
                      </Badge>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
