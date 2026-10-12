# 0010. Login by emailed link; admins need an authenticator app

Date: 2026-10-12
Status: Proposed

## Context

Mandir committee members range from students to retired volunteers. Passwords
get forgotten, reused and phished. The Toran admin area can approve mandir
claims and change what thousands of people see, so it needs more than an
email inbox to protect it.

## Decision

- Everyone logs in with a one-time link emailed to them (Supabase Auth). No
  passwords. The login page says the same thing whether or not an address
  has an account.
- Toran admins are listed in `public.toran_admins`, added by hand in the
  Supabase SQL editor, never through the app.
- The admin area also needs a code from an authenticator app (TOTP). The
  database only treats someone as an admin when their session has passed
  that step (`aal2`), so a stolen email link alone unlocks nothing.
- Access is decided in the pages and in database rules; `proxy.ts` only
  keeps sessions fresh.

## Consequences

Nothing for members to remember, and admin powers survive a compromised
inbox. Logging in depends on email arriving quickly, so a proper email
sender (custom SMTP) is needed before the pilot; Supabase's built-in sender
allows only a few emails an hour. Losing an authenticator app means another
admin (or the SQL editor) has to remove the factor.
