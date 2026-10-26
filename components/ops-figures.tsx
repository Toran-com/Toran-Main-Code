import type { ReactNode } from "react";
import { cardClass } from "@/components/ui";

// Figures for the admin area's Stats and Today pages: a number in a tile,
// and a small table of them.

export function FigureTile({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  // A line under the number, such as yesterday's figure.
  note?: string;
}) {
  return (
    <div className={`${cardClass} flex flex-col gap-1 p-4`}>
      <dt className="text-muted text-base">{label}</dt>
      <dd className="font-display text-4xl tabular-nums">
        {value.toLocaleString("en-GB")}
      </dd>
      {note && <dd className="text-muted text-base">{note}</dd>}
    </div>
  );
}

export function FigureTable({
  title,
  head,
  rows,
  empty,
}: {
  title: string;
  head: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  return (
    <section className={`${cardClass} flex flex-col gap-3 p-5`}>
      <h2 className="text-xl font-bold">{title}</h2>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead>
              <tr className="border-line text-muted border-b">
                {head.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`py-2 pr-3 font-semibold ${i ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-line border-b last:border-0">
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`py-2 pr-3 ${i ? "text-right tabular-nums" : ""}`}
                    >
                      {typeof cell === "number"
                        ? cell.toLocaleString("en-GB")
                        : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">{empty}</p>
      )}
    </section>
  );
}
