# 0002. One web app, no native apps for v1

Date: 2026-10-07
Status: Proposed

## Context

We need a public site, a mandir admin area and our own admin area. Native
iOS and Android apps would mean three codebases, store reviews and update
delays, with 1–2 hours a day to spend.

## Decision

Build one responsive web app that people can install to their home screen.
Public, mandir admin and Toran admin are areas of the same app, separated by
login and permissions.

## Consequences

One codebase, instant updates, works on any phone. We lose app-store
discovery and some push notification reach on older iPhones; the email
digest and WhatsApp reminders cover that. Revisit if users ask for an app.
