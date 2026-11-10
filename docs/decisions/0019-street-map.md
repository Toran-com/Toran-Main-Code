# 0019. A real street map from OpenFreeMap, drawn in the browser, and a mandir finder like a shop finder

Date: 2026-11-09
Status: Proposed

## Context

The maps (mandirs, What's on and Seva) were a night-time outline of the UK
that Toran drew itself, with OpenStreetMap's pictures only when zoomed in
to a town. It was elegant but plain: families couldn't see roads, parks or
towns until they zoomed right in, and the mandirs page didn't work like
the shop finders people know (Nike, Adidas): a search box, a list beside
the map, and the list and map working together.

Decision 0011 used OpenStreetMap's own tiles for the pilot, and said to
move to a tile provider before launch, as OpenStreetMap's volunteer-run
servers ask heavy users to. Limits are the same as then: no tracking
(decision 0006), no cost before launch, and pages light on older phones
(tests/speed.ts).

Options for the streets:

- **CARTO's light maps** look the part, but now need an API key, and
  commercial use is free only up to a monthly limit.
- **MapTiler, Stadia Maps, Mapbox**: an account and a key, free up to a
  limit, then paid.
- **OpenStreetMap's pictures, recoloured with a filter**: no cost, but
  busy (orange roads, pink motorways) and only so far a filter can tidy.
- **OpenFreeMap**: OpenStreetMap data as vector tiles, free for any use
  including commercial, with no limits, no account, no key and no
  cookies. The browser draws the map, so Toran sets every colour.

## Decision

- The streets come from **OpenFreeMap**, drawn in the browser by
  **MapLibre** inside the existing Leaflet map (via
  @maplibre/maplibre-gl-leaflet), from its "Liberty" style recoloured in
  `components/map-style.ts`: warm light land, soft blue water, green
  parks, white streets, gold motorways; midnight on a dark page. Shops,
  cafés and other points of interest are left out: the mandirs are the
  only places Toran marks.
- MapLibre (about 275 KB compressed) is downloaded only after the page
  and its pins are showing, and only when the style has arrived and the
  browser can draw it (WebGL). On phones asking to save data, or with
  1 GB of memory or less, and wherever the street map can't be drawn,
  the map uses **OpenStreetMap's pictures** instead (decision 0011), so
  it always works.
- Mandirs are midnight pins with a gold flame; groups are midnight
  circles with the number, which zoom in when tapped.
- `/mandirs` is a **mandir finder**: one search box (a town, a postcode or
  a mandir's name), "Near me", and the list beside the map on a computer
  (Map and List tabs on a phone). Each mandir shows its town, tradition,
  whether it's open now, and how far away once we know where the visitor
  is. Choosing a pin picks it out in the list and shows its card over the
  map; pointing at a mandir in the list lifts its pin; the list follows
  the map as it moves. A typed postcode is looked up through Toran
  (`/api/place`, as What's on does), so postcodes.io never sees the
  visitor.

## Consequences

- The map looks like a real map, in Toran's colours, at every zoom, and
  the finder works the way people expect from shop finders.
- No cost and no account. The visitor's browser fetches the street map
  from OpenFreeMap (or OpenStreetMap's pictures), so they see the
  visitor's IP address, like any website; the privacy notice says so.
- OpenFreeMap is run by one person and funded by donations. If it goes
  away or gets slow, the map falls back to OpenStreetMap's pictures by
  itself; the lasting fix would be to host the same tiles ourselves
  (OpenFreeMap publishes how) or switch the one style address in
  `components/map-style.ts`.
- The map view is heavier where the street map is drawn: about 275 KB
  more JavaScript, after the page has loaded. The speed test checks the
  page with OpenStreetMap's pictures, as before; low-memory and
  data-saving phones get the pictures too.
- The outline of the UK drawn by Toran, and its city names, are gone.
