# 0014. Committees invite colleagues themselves, by email address

Date: 2026-10-18
Status: Proposed

## Context

Each mandir's page has been run by whoever claimed it, checked by a Toran
admin. Committees share the work, and a page with one login stops being
kept up when that person is busy or leaves. Asking Toran to check every
extra person by phone doesn't scale, and Toran has no email service of its
own for sending invites (decision 0010: login links come from Supabase).

## Decision

Anyone on a mandir's committee can invite a colleague by email address.
The invite holds only that address, for 14 days. The colleague logs in
with that address and accepts on their account page; Toran sends no email,
so the committee member tells them (a "Send on WhatsApp" button writes the
message). Committee members can take off people they invited, and anyone
can leave; Toran admins can still remove anyone.

## Consequences

- A second person can be added in a minute, without Toran.
- Trust passes along the committee: Toran checked the first person, and
  they vouch for the next. If that's abused, Toran can still remove
  people (/ops) and the first member can take off anyone they added.
- Nobody can take off the person who invited them, so the original,
  checked member can't be pushed out by someone they invited.
- Colleagues on the same committee see each other's login emails.
- Accepting is the colleague's own consent to being recorded as on the
  committee (special category data), as a claim is.
- Expired invites are deleted the next time anyone invites, accepts or
  declines, rather than by a scheduled job; they can't be seen or used
  once expired.
