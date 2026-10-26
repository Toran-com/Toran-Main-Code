import { AddToCalendar } from "@/components/add-to-calendar";
import { PlanButton } from "@/components/plan";
import { ShareButtons } from "@/components/share-buttons";

// What you can do with an event, in one row: put it in your calendar,
// share it on WhatsApp, or add it to the family's plan.
export function EventActions({
  mandirSlug,
  eventId,
  title,
  shareText,
  path,
  copy = true,
  nextStartsAt,
}: {
  mandirSlug: string;
  eventId: string;
  title: string;
  shareText: string;
  path: string;
  copy?: boolean;
  // When it next happens, for the plan (lib/plan.ts).
  nextStartsAt?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AddToCalendar mandirSlug={mandirSlug} eventId={eventId} title={title} />
      <ShareButtons text={shareText} path={path} copy={copy} />
      {nextStartsAt && <PlanButton id={eventId} at={nextStartsAt} />}
    </div>
  );
}
