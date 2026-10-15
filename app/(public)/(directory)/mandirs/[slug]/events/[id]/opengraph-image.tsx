import { getMandirEvent } from "@/lib/directory";
import { formatEventStart } from "@/lib/format";
import { describeRule } from "@/lib/recurrence";
import { cardSize, shareCard } from "@/lib/share-card";
import { site } from "@/lib/site";

export const alt = "The event's name, date and mandir";
export const size = cardSize;
export const contentType = "image/png";

// The picture under a shared event link: when, what and where.
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const result = await getMandirEvent(slug, id);
  const page = result.state === "ok" ? result.data : null;
  if (!page) {
    return shareCard({ kicker: "Mandirs across the UK", title: site.tagline });
  }
  const { event, mandir } = page;
  const when = formatEventStart(event.next_starts_at, event.all_day);
  const rule = event.recurrence && describeRule(event.recurrence);
  return shareCard({
    kicker:
      event.status === "cancelled"
        ? `Cancelled · ${when}`
        : event.recurrence
          ? `${rule ?? "Repeats"} · next ${when}`
          : when,
    title: event.title,
    detail: `${mandir.name}, ${mandir.town}`,
  });
}
