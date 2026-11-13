"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { buttonClass } from "@/components/ui";
import { useT } from "@/components/use-t";
import { FAMILY_ACCOUNTS } from "@/lib/family-flag";
import {
  familyState,
  familyStateOnServer,
  onFamilyState,
} from "@/lib/family-state";
import { enHub } from "@/lib/i18n/client/hub";

// On My Toran, once family accounts are switched on (decision 0020): an
// invitation to log in, so what's here can follow the family to every
// device; once logged in, the family's explicit consent before anything is
// kept on the account (a separate, unticked box: DPIA section 5); and once
// they've agreed, a line saying it's kept.
const cardClass =
  "border-peacock/30 bg-surface shadow-card flex flex-col gap-3 rounded-3xl border p-6";

type T = (key: keyof typeof enHub) => string;

export function FamilyAccountNote() {
  const t = useT(enHub);
  const state = useSyncExternalStore(
    onFamilyState,
    familyState,
    familyStateOnServer,
  );
  if (!FAMILY_ACCOUNTS || state === "checking") return null;
  if (state === "on")
    return (
      <p className="bg-peacock/8 text-peacock self-start rounded-full px-4 py-2 font-semibold">
        ✓ {t("hub.account.saved")}
      </p>
    );
  if (state === "ask") return <Agree t={t} />;
  return (
    <section
      aria-labelledby="account-note"
      className={`${cardClass} sm:flex-row sm:items-center sm:justify-between sm:gap-6`}
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

// Nothing is saved to the account until this box is ticked and sent; the
// database records when (supabase/migrations/…_family_consent.sql).
function Agree({ t }: { t: T }) {
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <section aria-labelledby="account-agree" className={cardClass}>
      <h2 id="account-agree" className="font-display text-2xl">
        {t("hub.account.agreeTitle")}
      </h2>
      <p className="text-muted max-w-prose">{t("hub.account.agreeText")}</p>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ticked || busy) return;
          setBusy(true);
          setFailed(false);
          const ok = await import("@/lib/family-sync-run")
            .then(({ agree }) => agree())
            .catch(() => false);
          setBusy(false);
          setFailed(!ok);
        }}
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            value="yes"
            required
            checked={ticked}
            onChange={(e) => setTicked(e.target.checked)}
            className="mt-1.5 size-5 shrink-0"
          />
          <span>{t("hub.account.agreeLabel")}</span>
        </label>
        <button
          type="submit"
          disabled={busy}
          className={`${buttonClass} self-start`}
        >
          {t("hub.account.agreeButton")}
        </button>
        {failed && (
          <p role="alert" className="text-kumkum font-semibold">
            {t("hub.account.agreeFailed")}
          </p>
        )}
      </form>
    </section>
  );
}
