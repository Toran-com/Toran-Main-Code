"use client";

import { useActionState } from "react";
import { buttonClass, inputClass, Notice } from "@/components/ui";
import {
  confirmEnrolment,
  startEnrolment,
  verifySecondFactor,
  type EnrolState,
} from "./actions";

function CodeField() {
  return (
    <label className="flex flex-col gap-2 font-semibold">
      6-digit code from your authenticator app
      <input
        className={inputClass}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        required
      />
    </label>
  );
}

export function VerifySecondFactor() {
  const [state, action, pending] = useActionState(verifySecondFactor, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <CodeField />
      <button className={buttonClass} disabled={pending}>
        Unlock admin
      </button>
    </form>
  );
}

export function EnrolSecondFactor() {
  const [state, action, pending] = useActionState<EnrolState, FormData>(
    async (previous, formData) =>
      previous.step === "start"
        ? startEnrolment()
        : confirmEnrolment(previous, formData),
    { step: "start" },
  );

  if (state.step === "start") {
    return (
      <form action={action} className="flex flex-col gap-4">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <p className="text-muted">
          Admin access needs a second step: a code from an authenticator app
          such as Google Authenticator, Microsoft Authenticator or 1Password.
        </p>
        <button className={buttonClass} disabled={pending}>
          Set up an authenticator app
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <p>Scan this code with your authenticator app:</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URI from Supabase */}
      <img
        src={state.qr}
        alt="QR code for your authenticator app"
        className="bg-surface h-48 w-48 rounded-xl p-2"
      />
      <p className="text-muted text-base">
        Can&apos;t scan? Enter this key instead:{" "}
        <code data-testid="totp-secret" className="break-all">
          {state.secret}
        </code>
      </p>
      <CodeField />
      <button className={buttonClass} disabled={pending}>
        Confirm and unlock admin
      </button>
    </form>
  );
}
