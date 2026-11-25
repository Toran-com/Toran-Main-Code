# 0030. Email committees weekly, with last week drawn as pictures

Date: 2026-11-25
Status: Proposed

## Context

The monthly email (decision 0023) told committees how their page did, in
plain text. Milan asked for a weekly digest of their stats "in a very
graphic and fun way", with modern design, and chose for it to replace the
monthly one rather than add to it. Email programs don't run charts, many
hide pictures until asked, and none load the site's fonts.

## Decision

Each committee member gets one email every Monday morning about last week
on their mandir's page, instead of the monthly one:

- a picture of the week's visits, a bar per day with last week's behind,
  and how it compares; and a square picture of the week to post on
  WhatsApp. Both are drawn by the site from numbers signed into the
  picture's address (CRON_SECRET), in Midnight & Gold and the site's fonts;
- tiles for new followers, calendar adds, shares and seva places, each
  against last week; a cheer when they pass a round number of followers;
  the most visited event with a button to share it again; what's coming
  up; anything worth doing;
- every picture's numbers in words too, and a plain text version.

It uses the monthly email's switch (`COMMITTEE_EMAIL`), its stop links and
its "stopped" setting, so anyone who stopped the monthly email stays
stopped. Toran keeps which mandirs' committees had each week's email, not
who.

## Consequences

- Committees see their page working every week, at the start of it.
- Four times as many emails as before: each can be stopped in one press.
- The pictures need `CRON_SECRET` to stay the same; changing it breaks
  pictures in old emails as well as old stop links.
- The numbers are counts only, as on the Numbers page (decision 0015).
