// What a phone notification says (decision 0024): the day's new events at
// the mandirs someone follows, in one notification, and a mandir's
// notice. Pure, so the wording is tested on its own.

export type NewEvent = { title: string; when: string };
export type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

const MAX_BODY = 160;

function cut(text: string): string {
  return text.length <= MAX_BODY ? text : `${text.slice(0, MAX_BODY - 1)}…`;
}

// For one person: the new events at the mandirs they follow, by mandir.
// Null when nothing's new.
export function digestMessage(
  following: readonly string[],
  news: ReadonlyMap<string, { name: string; events: NewEvent[] }>,
): PushMessage | null {
  const mine = following.flatMap((slug) => {
    const n = news.get(slug);
    return n && n.events.length ? [{ slug, ...n }] : [];
  });
  if (!mine.length) return null;
  const total = mine.reduce((sum, m) => sum + m.events.length, 0);
  if (mine.length === 1) {
    const [m] = mine;
    const [first] = m.events;
    const more = m.events.length - 1;
    return {
      title: `New at ${m.name}`,
      body: cut(
        `${first.title}, ${first.when}${more ? `, and ${more} more` : ""}`,
      ),
      url: `/mandirs/${m.slug}`,
      tag: "toran-new-events",
    };
  }
  return {
    title: `${total} new events at your mandirs`,
    body: cut(
      mine
        .map(
          (m) =>
            `${m.name}: ${m.events[0].title}${m.events.length > 1 ? ` +${m.events.length - 1}` : ""}`,
        )
        .join(" · "),
    ),
    url: `/whats-on?mandirs=${mine.map((m) => m.slug).join(",")}`,
    tag: "toran-new-events",
  };
}

export function noticeMessage(
  mandir: { slug: string; name: string },
  body: string,
): PushMessage {
  return {
    title: `${mandir.name}: notice`,
    body: cut(body),
    url: `/mandirs/${mandir.slug}`,
    tag: `toran-notice-${mandir.slug}`,
  };
}
