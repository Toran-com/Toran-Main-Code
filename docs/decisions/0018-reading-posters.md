# 0018. Claude reads poster photos and PDFs into events, which a person checks

Date: 2026-10-25
Status: Proposed

## Context

Most mandirs share their programme as a poster photo or a PDF patrika,
often only in Gujarati, and many arrive in the weeks before Diwali. Toran
types each one up by hand in /ops/posters, which is slow, and a patrika can
list a dozen events. The nightly website checker deliberately doesn't use
AI, because nobody watches it run.

## Decision

Toran's admins can send a poster's photo or PDF to Claude (Anthropic's
API, model `claude-opus-5-5`) from /ops/posters. Claude returns the events
on it in a fixed shape (name, Gujarati name, date, time, description,
kind). Each event goes into the review queue like a typed-up poster,
marked "read by machine", and is published only after a person checks it:
the mandir's committee, or Toran where there's no committee. Events
already listed or waiting are left out (decision 0017).

- **Only on request, by an admin.** Nothing is read automatically, and the
  public can't send pictures to it.
- **Data minimisation (decision 0006).** Only the picture is sent, never
  who forwarded it. Claude is told to leave out private people's names,
  numbers and addresses. Toran doesn't keep the picture.
- **Off by default.** It needs `ANTHROPIC_API_KEY` in Vercel. Without it
  the card says so and posters are typed up as before.
- **Cost.** A few pence a poster at current prices, and only for what
  admins send: nothing runs on its own.

## Consequences

Typing a patrika up becomes checking it. Machine reading can be wrong
(a misread date or time), which is why nothing goes live without a person
checking, and why the queue marks these. Anthropic is a new processor in
the privacy notice; its region and data terms need checking before
launch, along with the other "[check]" items there.
