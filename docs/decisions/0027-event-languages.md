# 0027. Committees say what language an event is in, from a fixed list

Date: 2026-11-24
Status: Proposed

## Context

UK mandirs hold kathas, satsangs and classes in Gujarati, Hindi, Tamil,
Punjabi, Telugu, English and more. Families, and especially grandparents
and newcomers, want the ones in a language they follow; second-generation
families often want English. Toran's pages are in English, Gujarati and
Hindi, but that says nothing about the language of the event itself.

## Decision

Each event can list up to four languages from a fixed list (English,
Gujarati, Hindi, Tamil, Punjabi, Telugu, Bengali, Marathi, Kannada,
Malayalam and Sanskrit), stored as ISO 639-1 codes in `events.languages`
and checked by the database. Committees tick them when adding or changing
an event; none means not said. What's on can be narrowed to one language
(`?lang=gu`), offering only languages that events are listed in, and an
event's page names them, each in its own script with English after it.

## Consequences

- Families can find a katha or class in their language without reading
  every description.
- Events from websites and posters have no language until a committee
  adds one; the filter only shows events that say.
- A fixed list keeps the filter tidy and the codes valid; adding a
  language is a migration.
