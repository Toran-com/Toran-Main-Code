import type { MandirNotice } from "@/lib/directory";
import { formatDay } from "@/lib/format";
import { pageT } from "@/lib/i18n/page";

// Notices from the mandir's committee ("Closed today because of the
// snow"), at the top of its page and its events' pages, until their last
// day. The committee's own words, as typed.
export function MandirNotices({ notices }: { notices?: MandirNotice[] }) {
  if (!notices?.length) return null;
  const t = pageT();
  return (
    <section aria-label={t("notice.label")} className="flex flex-col gap-3">
      {notices.map((n) => (
        <div
          key={n.id}
          className="border-marigold bg-marigold/10 flex gap-3 rounded-2xl border-l-4 px-4 py-3"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="text-marigold-ink mt-0.5 size-6 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 2 20h20z" />
            <path d="M12 10v4M12 17h.01" />
          </svg>
          <div className="flex min-w-0 flex-col">
            <p className="text-marigold-ink text-base font-semibold">
              {t("notice.label")} ·{" "}
              {n.endsToday
                ? t("notice.today")
                : t("notice.until", { day: formatDay(n.until_on) })}
            </p>
            <p className="font-semibold break-words">{n.body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
