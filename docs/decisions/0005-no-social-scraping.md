# 0005. Mandirs send us events; no social media scraping

Date: 2026-10-07
Status: Proposed

## Context

Many mandirs post only on WhatsApp, Facebook or Instagram. Collecting from
Facebook or Instagram without the page owner's permission breaks Meta's
terms, and WhatsApp groups cannot be read at all. Getting banned or
challenged would put the whole service at risk.

## Decision

Mandirs forward posters and messages to an Toran WhatsApp number or email
address, and confirm the extracted event with one tap. Later, mandirs can
connect their own Facebook page through Meta's official sign-in. We crawl
only public websites, respecting robots.txt.

## Consequences

Coverage depends on mandirs taking part, so onboarding committees matters
more. In return, every source is permitted, input fits habits they already
have, and confirmation doubles as verification.
