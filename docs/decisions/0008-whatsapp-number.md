# 0008. Use Milan's personal number for WhatsApp during the pilot

Date: 2026-10-07
Status: Accepted, with a limit

## Context

The forward-to-publish route (decision 0005) needs a WhatsApp number that
committees can send posters to. Milan's number (07939546333) is already in
every outreach email, so committees know it and trust it.

Using a number with the WhatsApp Business Platform (the automated API) has
consequences: a number must first be on the WhatsApp Business app, not
regular WhatsApp; once connected to the API, group chats, broadcast lists
and some other features stop working on that number, and up to six months of
chat history can be synced into the API system.

## Decision

- **Pilot (now to v1):** use the personal number. Committees forward posters
  and messages to it; Milan (or the admin area) enters them by hand. Moving
  the number to the free WhatsApp Business app is optional and keeps
  personal chats.
- **Before automating (v1, January 2027):** connect a separate, dedicated
  number to the WhatsApp Business Platform, owned by the company. A
  pay-as-you-go SIM or eSIM is enough. Tell committees the new number in the
  same message thread so the change is easy.
- The personal number is never connected to the API.

## Consequences

Zero cost and full trust during the pilot. Forwards cost Milan time to enter
by hand, which is useful: it shows what committees actually send before we
build the extractor. The switch to a company number has to be planned, and
some committees will keep using the old number for a while.
