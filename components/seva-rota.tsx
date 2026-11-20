import { Badge } from "@/components/public-shell";
import { TakeSlot } from "@/components/seva-slots";
import { Card } from "@/components/ui";
import type { SevaRole } from "@/lib/directory";
import { pageT } from "@/lib/i18n/page";
import { placesTaken, shiftLabel } from "@/lib/seva";

// One seva for volunteers: its times, how many places are taken, and (if
// the committee lets volunteers take places on Toran) "Take this slot",
// with no name asked (decision 0013). On an event's seva page, and on the
// page of a seva that's on its own.
export function SevaRoleCard({
  role,
  open,
  slug,
  group,
  title,
  place,
  path,
}: {
  role: SevaRole;
  // Whether places can be taken now: the seva is open, and its event (if
  // any) is still to come and on.
  open: boolean;
  slug: string;
  // What the slot is kept under on the volunteer's phone (the event, or
  // the seva), its title, where it is and its page.
  group: string;
  title: string;
  place: string;
  path: string;
}) {
  const t = pageT();
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-bold">{role.name}</h2>
        {role.needs_dbs && <Badge tone="marigold">{t("seva.dbsNeeded")}</Badge>}
      </div>
      {role.description && <p className="text-muted">{role.description}</p>}
      <ul className="flex flex-col gap-3">
        {role.shifts.map((shift) => {
          const done = placesTaken(shift);
          const full = done >= shift.needed;
          const label = shiftLabel(shift.starts_at, shift.ends_at);
          return (
            <li
              key={shift.id}
              className="border-line flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
            >
              <div className="flex min-w-48 flex-1 flex-col gap-1">
                <span className="font-semibold">{label}</span>
                <span
                  className="bg-sunk h-2.5 overflow-hidden rounded-full"
                  aria-hidden="true"
                >
                  <span
                    className={`block h-full rounded-full ${full ? "bg-peacock" : "bg-marigold"}`}
                    style={{ width: `${(done / shift.needed) * 100}%` }}
                  />
                </span>
                <span className="text-muted text-base">
                  {t("seva.shiftTaken", { done, needed: shift.needed })}
                </span>
              </div>
              {open && !role.needs_dbs && (
                <TakeSlot
                  slug={slug}
                  full={full}
                  details={{
                    shift: shift.id,
                    event: group,
                    role: role.name,
                    label,
                    starts_at: shift.starts_at,
                    ends_at: shift.ends_at,
                    title,
                    place,
                    path,
                  }}
                />
              )}
              {open && role.needs_dbs && (
                <p className="text-muted text-base">{t("seva.askCommittee")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
