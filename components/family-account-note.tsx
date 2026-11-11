"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buttonClass } from "@/components/ui";
import { useT } from "@/components/use-t";
import { FAMILY_ACCOUNTS } from "@/lib/family-flag";
import { enHub } from "@/lib/i18n/client/hub";

// On My Toran, once family accounts are switched on (decision 0020): an
// invitation to log in, so what's here follows the family to every
// device, or, when logged in, a line saying it already does.
const noSubscribe = () => () => {};
const loggedIn = () => /(^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);

export function FamilyAccountNote() {
  const t = useT(enHub);
  const known = useSyncExternalStore(noSubscribe, loggedIn, () => false);
  if (!FAMILY_ACCOUNTS) return null;
  if (known)
    return (
      <p className="bg-peacock/8 text-peacock self-start rounded-full px-4 py-2 font-semibold">
        ✓ {t("hub.account.saved")}
      </p>
    );
  return (
    <section
      aria-labelledby="account-note"
      className="border-peacock/30 bg-surface shadow-card flex flex-col gap-3 rounded-3xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="account-note" className="font-display text-2xl">
          {t("hub.account.title")}
        </h2>
        <p className="text-muted">{t("hub.account.text")}</p>
      </div>
      <Link
        href="/login"
        className={`${buttonClass} shrink-0 text-center sm:w-auto`}
      >
        {t("hub.account.button")}
      </Link>
    </section>
  );
}
