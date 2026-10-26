import { PhoneIcon, PinIcon } from "@/components/icons";
import { pageT } from "@/lib/i18n/page";

// Directions to the mandir in the phone's maps app, by its name and
// postcode; null without a postcode.
export function directionsTo(mandir: {
  name: string;
  postcode: string | null;
}): string | null {
  return mandir.postcode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${mandir.name} ${mandir.postcode}`,
      )}`
    : null;
}

// The two things people most often want before setting off, as big
// buttons side by side: directions, and a call to the mandir (its number
// shown, so you know who you're ringing). Either can be missing.
export function CallAndDirections({
  mandir,
}: {
  mandir: { name: string; postcode: string | null; phone: string | null };
}) {
  const t = pageT();
  const directions = directionsTo(mandir);
  const phone = mandir.phone;
  if (!directions && !phone) return null;
  const big =
    "flex min-h-16 items-center justify-center gap-3 rounded-2xl px-4 py-3 text-lg font-semibold no-underline transition active:scale-[0.98] [&_svg]:size-6 [&_svg]:shrink-0";
  return (
    // Side by side when there's room, one above the other on a narrow
    // phone or in the event page's card.
    <div className="grid w-full max-w-xl grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
      {directions && (
        <a
          href={directions}
          rel="noopener"
          className={`${big} bg-peacock text-on-peacock hover:bg-peacock-deep`}
        >
          <PinIcon />
          {t("mandir.directions")}
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          aria-label={t("mandir.callNumber", { name: mandir.name, phone })}
          className={`${big} border-peacock text-peacock hover:bg-peacock/5 border-2`}
        >
          <PhoneIcon />
          <span className="flex flex-col items-start leading-tight">
            {t("mandir.call")}
            <span className="text-base font-medium whitespace-nowrap">
              {phone}
            </span>
          </span>
        </a>
      )}
    </div>
  );
}
