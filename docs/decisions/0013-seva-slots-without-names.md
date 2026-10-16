# 0013. Volunteers take seva slots without giving a name

Date: 2026-10-16
Status: Proposed. Changes one line of 0006 ("Rota signups need a name and
one contact detail") until Toran is registered with the ICO and has a DPIA.

## Context

Committees struggle to fill seva rotas: they post in WhatsApp, replies
trickle in, and nobody can see at a glance what's still needed. Decision
0006 says a sign-up holds a name and one contact detail, and that no
personal data is collected before ICO registration and a DPIA. Neither is
done yet, and where someone volunteers can reveal their religion.

## Decision

Build sign-up that holds no personal data:

- Each shift shows "3 of 7" and a **Take this slot** button. Taking a slot
  stores a row with a random id and the time, nothing else: no name,
  contact detail, IP address or device detail.
- The volunteer's phone keeps the random id (in the browser's storage), so
  it can show "You're on Kitchen, Fri 6pm", add the shift to their calendar
  and give the slot back. Nobody else can give it back.
- The committee **turns sign-up on per event** (off by default), can add
  people who said yes elsewhere (a number, e.g. from WhatsApp), and can
  clear online slots if someone fills a rota as a joke.
- Roles that **need a DBS check** can't be taken online: the mandir must
  know who does them.

## Consequences

- No personal data, so no new ICO or DPIA work for this feature, and an
  easy promise for committees and families.
- The committee knows **how many** are coming, not **who**. For most seva
  (kitchen, parking, shoes) that's enough; committees still talk to their
  volunteers in WhatsApp as they do today.
- Taps can't be verified, so a count can be wrong (someone taps and doesn't
  come, or fills slots for a joke). The committee sees when slots were taken
  and can clear them; it's off unless they turn it on.
- Reminders can only be the volunteer's own calendar entry: Toran can't
  message someone it doesn't know.
- When Toran is registered with the ICO and has a DPIA, named sign-up
  (0006) can be added for committees that want it; this stays as the
  no-names option.
