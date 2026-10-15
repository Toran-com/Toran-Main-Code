# 0011. A map of mandirs with Leaflet and OpenStreetMap

Date: 2026-10-14
Status: Proposed

## Context

Families want to see which mandirs are near them, not only read a list by
region. The mandirs already have map positions (worked out from their
postcodes by "Fill in map positions" in /ops). A map needs two things: code
to draw it in the browser, and the map pictures (tiles) behind the dots.

Limits: pages must stay light on older phones (tests/speed.ts); no tracking
(decision 0006); no cost before launch; and the list must keep working for
screen readers and anyone without JavaScript.

## Decision

- Draw the map with **Leaflet** (open source, about 45 KB compressed),
  downloaded only when the map is shown.
- Use **OpenStreetMap's own tiles** (tile.openstreetmap.org) for the pilot,
  with the required credit on the map. No account or key is needed.
- The map and the list are two views of the same data, with one search box.
  The map is the default once mandirs have map positions; the list is a tap
  away and is what visitors without JavaScript get.
- "Near me" asks the browser for the visitor's location and only moves the
  map. Toran never sends or keeps the location.

## Consequences

- No cost and no new account. The visitor's browser fetches tiles from
  OpenStreetMap, so OpenStreetMap sees their IP address (like any website
  they visit); the privacy notice says so.
- OpenStreetMap's tile servers are run by volunteers and their usage policy
  asks heavy users to find their own. Before launch, or if traffic grows,
  switch to a tile provider with a free tier (for example MapTiler or
  Stadia Maps) or host our own tiles. That is a one-line change in
  components/mandir-map.tsx plus a processor entry in the privacy notice.
- The /mandirs page is heavier when the map shows: about 45 KB more
  JavaScript, plus the map pictures, which load after the page and are
  cached by the browser. The speed test allows for this on the map view
  only.
