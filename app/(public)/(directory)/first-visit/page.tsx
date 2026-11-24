import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, Card } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { localePath, pageT } from "@/lib/i18n/page";
import { pageMetadata } from "@/lib/site";

// What to expect on a first visit to a mandir: shoes, dress, darshan,
// aarti, prasad, photos and giving. General, since customs differ: each
// mandir's own page has its times, access and the committee's note.

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return pageMetadata(
    t("firstVisit.title"),
    t("firstVisit.description"),
    localePath("/first-visit"),
  );
}

const SECTIONS: { title: MessageKey; items: MessageKey[] }[] = [
  {
    title: "firstVisit.arriveTitle",
    items: ["firstVisit.arrive1", "firstVisit.arrive2", "firstVisit.arrive3"],
  },
  {
    title: "firstVisit.dressTitle",
    items: ["firstVisit.dress1", "firstVisit.dress2", "firstVisit.dress3"],
  },
  {
    title: "firstVisit.darshanTitle",
    items: [
      "firstVisit.darshan1",
      "firstVisit.darshan2",
      "firstVisit.darshan3",
      "firstVisit.darshan4",
    ],
  },
  {
    title: "firstVisit.aartiTitle",
    items: ["firstVisit.aarti1", "firstVisit.aarti2"],
  },
  {
    title: "firstVisit.prasadTitle",
    items: ["firstVisit.prasad1", "firstVisit.prasad2"],
  },
  { title: "firstVisit.photosTitle", items: ["firstVisit.photos1"] },
  { title: "firstVisit.givingTitle", items: ["firstVisit.giving1"] },
  { title: "firstVisit.childrenTitle", items: ["firstVisit.children1"] },
  { title: "firstVisit.checkTitle", items: ["firstVisit.check1"] },
];

export default function FirstVisitPage() {
  const t = pageT();
  return (
    <div className="page-wide flex flex-col gap-6 sm:gap-8">
      <PageHeading
        title={t("firstVisit.title")}
        intro={t("firstVisit.intro")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map(({ title, items }) => (
          <Card key={title}>
            <section className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold">{t(title)}</h2>
              <ul className="flex list-disc flex-col gap-2 pl-5">
                {items.map((item) => (
                  <li key={item}>{t(item)}</li>
                ))}
              </ul>
            </section>
          </Card>
        ))}
      </div>
      <Link
        href={localePath("/mandirs")}
        className={`${buttonClass} text-center no-underline sm:w-auto sm:self-start`}
      >
        {t("firstVisit.findMandir")}
      </Link>
    </div>
  );
}
