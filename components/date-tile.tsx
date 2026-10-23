import { DateTileView, type DateTileProps } from "@/components/date-tile-view";
import { dateTileParts } from "@/lib/format";

// A day as a little page from a panchang: the month in kumkum, the day in
// the headline serif, and the weekday. The full date is for screen
// readers, which would otherwise read "NOV 8 Sun".
export function DateTile({
  date,
  ...props
}: DateTileProps & {
  // A day (YYYY-MM-DD) or a moment (an ISO time, shown on its UK day).
  date: string;
}) {
  return <DateTileView parts={dateTileParts(date)} {...props} />;
}
