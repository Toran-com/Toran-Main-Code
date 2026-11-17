# Toran design system: "Midnight & Gold"

Chosen by Milan on 4 November 2026 from three directions (canvas
"Toran design directions"). Evening aarti: deep midnight blue and gold,
calm and premium, with a classical carved-stone headline face.

The site is for Hindu families of every age, and for mandir committees.
Every rule here serves three things: **easy to read, obvious what to
press, and never fussy.** Before changing how anything looks, check it
against this file. Use the token names in code, never raw values.

UXKIN (a library of real websites) was not connected when this was
written. The direction comes from Toran's own needs and well-known
patterns, including Apple's site (looked at on 4 November 2026: a slim
dark bar, short centred headlines, one filled button and one outline
button in a single blue, and full-width panels).

## Colour: each colour has one job

| Token (Tailwind name)     | Light                | Dark      | Job                                                                                    |
| ------------------------- | -------------------- | --------- | -------------------------------------------------------------------------------------- |
| `bg`                      | `#f6f4ef`            | `#0b1222` | Page background ("stone")                                                              |
| `surface`                 | `#ffffff`            | `#131c33` | Cards, the menu, inputs                                                                |
| `sunk`                    | `#eeebe4`            | `#0e1629` | Quiet panels, hover on light                                                           |
| `ink`                     | `#1a1a22`            | `#eef0f7` | Text and headings                                                                      |
| `muted`                   | `#55566a`            | `#a9aec4` | Secondary text (6.6:1 on `bg`)                                                         |
| `line`, `line-strong`     | 12%, 20%             | 12%, 22%  | Dividers and borders                                                                   |
| `peacock` ("lapis")       | `#1f3a8a`            | `#9db8ff` | **Everything you can press**: buttons, links, the selected tab. Blue means "press it". |
| `on-peacock`              | `#ffffff`            | `#0b1222` | Text on a lapis button                                                                 |
| `peacock-deep`            | `#14213d`            | `#c3d3ff` | Hover and pressed state of lapis                                                       |
| `night` ("midnight")      | `#14213d`            | `#16244a` | The header and each page's one bold band                                               |
| `on-night`, `night-muted` | `#f6f4ef`, `#c9ccda` | same      | Text on midnight                                                                       |
| `night-accent` ("gold")   | `#d9a441`            | `#e2b65a` | The main button on a midnight band; highlights and the focus ring on midnight          |
| `marigold` ("gold")       | `#d9a441`            | `#e2b65a` | The logo and festival marks. **Never small text on a light page.**                     |
| `marigold-ink`            | `#7a5a12`            | `#e8c477` | Gold-family text on light ("In 4 days")                                                |
| `kumkum`                  | `#b3261e`            | `#ff7a70` | **Cancelled and errors only**                                                          |
| `leaf-ink`, `leaf-tint`   | `#2f6a2b`, `#e9f2e7` | `#a6dca1` | "Confirmed by the mandir"                                                              |
| `tile`, `date`            | `#eef0f7`, `#1f3a8a` | tinted    | Date and time tiles                                                                    |

Some token names are older than the colours they hold now: `peacock` is
lapis blue, `marigold` is gold, `night` is midnight. A high-contrast mode
(chosen in the menu) darkens text and lines further. All text meets WCAG
2.2 AA (4.5:1, or 3:1 for large text).

**Don't:** add new colours for a single element, use gold for small text
on light, use red for anything but cancelled or errors, or use gradients
as decoration.

## Typography

- **Headings:** Marcellus (one weight, 400), a classical serif like
  letters carved over a doorway. Never fake bold (`font-synthesis: none`).
  Gujarati headings use Noto Serif Gujarati; Hindi uses the phone's own
  Devanagari font.
- **Reading:** Mulish, 400/600/700. **17px minimum**, the iPhone's own
  default text size (the page's `1rem` is 17px; Larger, at the top of the
  menu, is 20px and Largest is 22.5px).
- **Wordmark:** "Toran" in Marcellus, uppercase, letter-spaced 0.16em,
  written in normal case in the HTML so screen readers say the word.
- **Scale on laptops:** 17 (body) · 19 (lead) · 25 · 32 (day headings) ·
  38–51 (section headings) · 61–96 (page and home headlines).
- **Scale on phones** (under 640px; `app/globals.css` sets smaller
  Tailwind sizes there): 17 (body) · 18 (lead) · 22 (card titles) · 26–30
  (day and section headings) · 36–40 (page and home headlines), so a
  screen holds more than a title and one card.
- Line height 1.5 for reading and 1.0–1.15 for headlines. Keep lines to
  60–75 characters.

## Spacing and layout

- 4px base. Common steps: 8, 12, 16, 24, 32, 48, 64, 96 and 112.
- Page width: 88rem for wide pages (`wideClass`) and 48rem for reading
  pages.
- Sections: 64px apart on a phone, 96–112px on a laptop. Generous space
  is part of the look.
- Header: one row, always at the top. Once the page has scrolled it's a
  little see-through with the page blurred behind it; on a phone it slides
  away while you scroll down and comes back the moment you scroll up, so
  the page has the screen. A thin gold line along its foot shows how far
  down the page you are. On a phone, four labelled tabs sit along the
  bottom and never move; the pill behind the current one slides across.
- Footer: a midnight band under its own garland, so a page ends as it
  began.
- **First screen on a phone:** what the page is for and its main action
  are both above the bar along the bottom. On the home page that's the
  headline and "Find events near me"; on What's on it's the first event.
- **Things that follow you:** a day's heading stays under the header
  while its events scroll past (`.sticks`), as does the committee page's
  section bar. On a phone, What's on has one floating button above the
  bottom bar to switch to the map (or back to the list).
- **Rows to swipe** (`.swipe-row`): festival cards, and on a phone the
  six steps of "See how Toran works". Cards click into place, the next
  one peeks in at the edge, and dots show where you are.
- A page heading (`PageHeading`) has a short gold rule ending in a
  diamond beneath it. Narrow pages (log in, your account, a form) have a
  faint rangoli either side on a wide laptop screen, clear of the text.

## Shape and depth

- **Radius:** 999px for buttons, chips and tabs; 24px (`rounded-3xl`) for
  cards; 32px for big panels; 12–16px for tiles.
- **Shadows:** two only. `shadow-card` for cards at rest, `shadow-lift`
  for cards under the pointer and for the menu. Both are tinted midnight.

## Components

- **Primary button** (`buttonClass`): filled lapis, white text, pill
  shape, 18–20px semibold. **One per screen.** On a midnight band it's
  gold with midnight text.
- **Secondary button** (`quietButtonClass`): a 2px lapis outline with
  lapis text. On midnight: an outline in `on-night`.
- **Link:** lapis, underlined. Hover makes the underline thicker.
- **Chips and filters** (`pillButtonClass`): white with a hairline
  border; the selected one is filled midnight.
- **Sheets** (`components/sheet.tsx`): a form or a choice that comes up
  from the bottom of a phone when its button is pressed, with a handle,
  a title and a close button; Escape or a tap outside closes it. Used
  wherever a form would otherwise fill the screen before anyone needs it.
- **Cards** (`cardClass`): white, 24px radius, hairline border,
  `shadow-card`; they rise into view on scroll.
- **Focus:** a 3px lapis ring, 3px from the edge; gold on midnight.
- **Icons:** `components/line-icons.tsx` and the bottom-bar icons: 24px
  grid, 2px rounded line, `currentColor`. **No emoji in the interface**
  (text people send on WhatsApp is the only exception).
- **Logo** (`Logo`, `ToranMark`): a T made of a toran with four hanging
  drops. Gold line work on midnight; on light, a midnight tile with gold.
  App icons are in `public/icons`.
- **Garland** (`.toran`): a fine gold line with small drops, under the
  header.
- **Maps** (`components/uk-map.ts`, shared by the mandirs, What's on and
  Seva maps): a real street map (OpenFreeMap, drawn in the browser;
  decision 0019) in Toran's colours (`components/map-style.ts`): warm
  light land, soft blue water, green parks, white streets with grey
  edges and gold motorways; on a dark page the same map at night,
  midnight land and darker sea. No shops or cafés: the mandirs are the
  only places marked. One mandir is a midnight pin with a gold flame;
  several together are a midnight circle with a white edge, a gold ring
  and the number. Pins drop in one after another as the map opens, lift
  when pointed at or focused, and turn gold while chosen.
- **Using a map:** it never traps the page. Scrolling scrolls the page
  (Ctrl or ⌘ and scroll zooms, as on Google Maps); on a phone one finger
  scrolls the page and two move the map, and a short hint says so. Big
  44px buttons: zoom, full screen (where one finger moves it; Esc closes
  it) and back to the whole UK. A circle zooms in when tapped (Enter or
  Space from the keyboard). With a mouse, a pin's name shows as you
  point at it.
- **The mandir finder** (`/mandirs`, `components/directory-list.tsx`),
  like the best shop finders: one search box (a town, a postcode or a
  mandir's name) and "Near me" at the top; on a computer the list sits
  beside the map in one card, and on a phone "Map" and "List" are tabs.
  Each mandir in the list has its name (the way to its page), town and
  tradition, "Open now · until 8:30pm" in green or "Closed now · opens
  …", how far away once we know, and a "Show on map" button. Until the
  list is sorted by distance it's grouped by region under small sticky
  headings. Choosing a pin turns it gold, picks it out in the list (a
  marigold edge) and shows its card over the bottom of the map: name in
  the heading font, town, tradition and distance, open now, a filled
  "See what's on" and Directions (Google Maps). Pointing at a mandir in
  the list lifts its pin; moving the map narrows the list to what's on
  it, nearest the middle first.

## Admin area

The admin pages (`/ops`) are a tool, so they look like one, in the same
colours and type:

- **Frame:** a midnight side bar on a laptop that stays put between pages
  (`components/ops-chrome.tsx`): the tools in three groups (Overview,
  Content, Messages), each with a line icon (`components/ops-icon.tsx`),
  and a gold count where something is waiting. The page you're on has a
  gold edge. On a phone, the same menu opens from "Admin menu".
- **Pages** (`components/ops-page.tsx`): the tool's name large, one line
  on what it's for, then the work.
- **Dashboard:** what's waiting as four numbers you can tap (gold when
  there's something to do), then every tool as a card with what it does.
- The side bar only appears for an admin signed in with their second
  factor; anyone else sees the site's own header.

## Committee area

A mandir's own page for its committee (`/manage/<mandir>`), the full
width of the screen:

Made for a phone first: committees mostly use it on one, so every form
waits until it's wanted and nothing is wider than the screen.

- **Top:** the mandir's name, its town and a link to its public page, then
  three equal parts that always fit: Events (this page), Seva, Numbers.
  Nothing scrolls sideways.
- **"Add events":** one full-width button. It opens a sheet that asks how
  (a photo of a poster, a pasted WhatsApp message, typing it in, ticking
  festivals or last year's events) and then shows only that way's form,
  with a back arrow to the choices.
- **To do:** one card of rows to tap, setup steps first (with "Set up 2
  of 3"), then what needs doing now. A row opens the part it's about.
- **Posters waiting for you**, when there are any.
- **Coming up:** one line per event (date and name; tap to edit) and a
  "⋯" button for a sheet with Still on, Cancel, Duplicate, Seva rota and
  Remove. The first six, then "Show more".
- **Share:** this week's message to send on WhatsApp or copy (the message
  itself a tap away), and the festival's picture and sheet.
- **Your mandir:** rows for Committee, Photo, Details, Your calendar and
  Recent changes, each opening its own sheet.
- **Sheets** (`components/sheet.tsx`): come up from the bottom of a phone,
  sit in the middle of a bigger screen, over a dimmed page. A link to a
  sheet's id (`#details`, `#add-event`) opens it; after sending its form
  it closes, or stays open to say what went wrong.
- On a laptop: two columns, adding and events on the left, sharing and
  the mandir on the right.
- **Its other pages:** Seva and Numbers are wide pages (Numbers shows its
  four totals in one row on a laptop); forms stay narrow.

## Motion

Calm and purposeful, never decoration for its own sake.

- **Scroll:** sections and cards (`.reveal`) rise 48px into place as
  they enter the screen. They move but never fade, so text is at full
  contrast even halfway through. The animation is tied to scrolling (CSS
  `animation-timeline: view()`), not to a timer, and needs no
  JavaScript. Browsers without it just show the content.
- **Pages:** content rises 10px as a page opens (`.rise`, `.rise-list`).
- **Between pages:** what's on both pages moves from one to the other
  (`components/morph.tsx`, React's `<ViewTransition>`): an event's date
  tile and name grow from its card into the event page; a mandir's name
  moves from the list into its heading. The rest crossfades in 180ms;
  the header and the bar along the bottom stay still.
- **Scroll story:** on a laptop the home page keeps a phone on screen
  while six steps scroll past; its screen changes to the step in view and
  the button that step is about is outlined in gold, with a gentle tap
  (`components/home-story.tsx`). On a phone the six steps are cards in a
  row to swipe, each with its own phone. The phone is a picture; each
  step says in words what its button does and links to try it.
- **The welcome:** the lit diya (`components/hero-diya.tsx`) always fits
  on the first screen. Its flame flickers, leans towards the mouse and
  sways when the page is scrolled, with sparks rising from it; the warm
  light it throws across the welcome breathes, drifts after the mouse and
  grows as you scroll down.
- **Header and bars:** see "Spacing and layout". The header's slide,
  its blur and the progress line follow the scroll
  (`components/scroll-chrome.tsx` marks `<html>`; the line is CSS
  `animation-timeline: scroll()`).
- **Swiping:** in a row to swipe, cards at the edges sit a little smaller
  and settle to full size in the middle (`.swipe-settle`).
- **Opening things:** the menu slides in from the right while the page
  dims; the filter panel pops open from its button; folded cards grow to
  their height. Jumping to a part of a page glides there.
- **Headings:** the gold rule under a page heading draws in from the
  left.
- **Pointer:** cards lift 3px (`.lift`); rows in a list of events tint;
  buttons rise 1px under the pointer and press in when tapped.
- **Durations:** 200–450ms, easing `cubic-bezier(0.2, 0.7, 0.2, 1)`; a
  little spring (`cubic-bezier(0.3, 1.35, 0.5, 1)`) only for the tab
  pill.
- **Reduced motion:** everything above is off when the device asks for
  less motion. Never animate in a way that hides content from someone
  who can't scroll or animate.

## Imagery

Mandirs' own photos where they've given them (exterior only, no people).
Otherwise line art in gold on midnight: the diya, the garland and the
rangoli. No stock photos and no AI-made pictures of people or deities.
