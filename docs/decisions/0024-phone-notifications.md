# 0024. Phone notifications from followed mandirs, without an account

Date: 2026-11-24
Status: Proposed

## Context

Families come back when something tells them to. A committee's notice
("Closed today") matters most in the hour it's posted, and new events are
easy to miss. Following a mandir stays on the phone (decision 0006), so
Toran can't tell anyone anything unless they give it a way to.

## Decision

Web push, the browser's own notifications, with no app and no account. A
family presses "Turn on notifications" (on My Toran, or under Follow on a
mandir's page); their browser gives Toran a push address (a long random web
address at Apple, Google, Mozilla or Microsoft, with keys to encrypt to it)
and Toran keeps it with the mandirs they follow, nothing else. A notice
from one of those mandirs goes out at once; new events go once a day, early
evening, in one notification. Turning them off deletes the address at once,
as does the push service saying it's gone, and a year without use. Off
until Toran's VAPID keys are set in Vercel. On iPhone it works once Toran
is on the Home Screen (iOS 16.4 and later).

## Consequences

- A reason to come back, chosen by the family, about mandirs they chose.
- Toran now holds, for those who turn it on, a device's push address and
  the mandirs it follows: together they can suggest someone's religion.
  It is pseudonymous (no name, email or account), only the site's server
  code can read it, and it is deleted on request. The DPIA and privacy
  notice cover it.
- One more daily scheduled job (Vercel allows 100 per project).
- Changing the VAPID keys stops every existing subscription working; keep
  them.
