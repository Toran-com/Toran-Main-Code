import { AddToCalendar } from "@/components/add-to-calendar";
import { ShareButtons } from "@/components/share-buttons";

// What you can do with an event, in one row: put it in your calendar, or
// share it on WhatsApp.
export function EventActions({
  mandirSlug,
  eventId,
  title,
  shareText,
  path,
  copy = true,
}: {
  mandirSlug: string;
  eventId: string;
  title: string;
  shareText: string;
  path: string;
  copy?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AddToCalendar mandirSlug={mandirSlug} eventId={eventId} title={title} />
      <ShareButtons text={shareText} path={path} copy={copy} />
    </div>
  );
}
