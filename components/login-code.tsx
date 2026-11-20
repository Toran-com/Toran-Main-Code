import { logInWithCode } from "@/app/(public)/login/actions";
import { buttonClass, inputClass, Notice } from "@/components/ui";

// After the login email is sent: what to do with it, and a box for the
// 6-digit code in it, for anyone who'd rather type the code than press
// the link (or reads email on another device). On "Log in" and "Create
// an account" (/join).
export function LoginCode({
  next,
  from,
  wrong,
}: {
  next: string;
  from: "login" | "join";
  // The code typed in didn't work.
  wrong: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">
        It can take a minute to arrive. If it isn&apos;t in your inbox, look in
        your junk or spam folder. The email works for 24 hours.
      </p>
      <form action={logInWithCode} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="from" value={from} />
        {wrong && (
          <Notice tone="error">
            That code didn&apos;t work. Check it against the email, or press the
            link in the email instead.
          </Notice>
        )}
        <label className="flex flex-col gap-2 font-semibold">
          Or type the 6-digit code from the email
          <input
            className={`${inputClass} max-w-[14rem] text-2xl tracking-[0.3em]`}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,12}"
            maxLength={12}
            required
          />
        </label>
        <button
          type="submit"
          className={`${buttonClass} sm:w-auto sm:self-start`}
        >
          Log in with the code
        </button>
      </form>
    </div>
  );
}
