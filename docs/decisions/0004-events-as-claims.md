# 0004. Events are sourced claims, not plain facts

Date: 2026-10-07
Status: Proposed

## Context

Event details will come from admins, forwarded posters, websites and public
reports, and they will sometimes disagree or go out of date. Families need
to trust what they see.

## Decision

Store each piece of information as a claim with its source, time and
confidence. The listing shows the best-supported version and labels where it
came from ("Confirmed by the mandir, 3 Oct"). Admin confirmation beats every
other source.

## Consequences

More complex data model, but we can explain any listing, resolve conflicts
by rule rather than by hand, and show honest freshness labels.
