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
- **Reading:** Mulish, 400/600/700. **18px minimum** (the page's `1rem`
  is 18px; Larger is 20px and Largest is 22.5px).
- **Wordmark:** "Toran" in Marcellus, uppercase, letter-spaced 0.16em,
  written in normal case in the HTML so screen readers say the word.
- **Scale:** 18 (body) · 20 (lead) · 24 · 30 (day headings) · 36–48
  (section headings) · 52–88 (page and home headlines). Line height 1.5
  for reading and 1.0–1.15 for headlines. Keep lines to 60–75 characters.

## Spacing and layout

- 4px base. Common steps: 8, 12, 16, 24, 32, 48, 64, 96 and 112.
- Page width: 88rem for wide pages (`wideClass`) and 48rem for reading
  pages.
- Sections: 64px apart on a phone, 96–112px on a laptop. Generous space
  is part of the look.
- Header: one row. On a phone, four labelled tabs sit along the bottom.

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
- **Scroll story:** on the home page a phone stays on screen while six
  steps scroll past; its screen changes to the step in view and the
  button that step is about is outlined in gold, with a gentle tap
  (`components/home-story.tsx`). The phone is a picture; each step says
  in words what its button does and links to try it.
- **Pointer:** cards lift 3px (`.lift`); buttons press in slightly.
- **Durations:** 200–450ms, easing `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- **Reduced motion:** everything above is off when the device asks for
  less motion. Never animate in a way that hides content from someone
  who can't scroll or animate.

## Imagery

Mandirs' own photos where they've given them (exterior only, no people).
Otherwise line art in gold on midnight: the diya, the garland and the
rangoli. No stock photos and no AI-made pictures of people or deities.
