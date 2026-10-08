# Core functions

Two functions, one per side of the market, chosen from the gaps in
`docs/market-gaps.md`. Everything else in the original brief is either
supporting (festival dates) or later (verified seva record, bookings, donations).

---

## Function 1 — What's on near me (devotees)

**The job:** "Tell me what's happening at mandirs near me in the next two
weeks, and which ones are marking the festival that's coming up."

**Why this one:** demand is proven (Hindu Events UK lists events by hand), but
existing coverage is tiny (33 events, 18 temples) and depends on one person
taking phone calls. Mandirs publish on their own websites and social pages,
which nobody reads across.

### v1 scope

- **Source register.** Every UK mandir with name, postcode, tradition, website
  and social links. Seed from public directories; start with two clusters
  (Harrow/Wembley/Brent and Leicester) rather than the whole UK.
- **Collection.** Read each mandir's own website on a schedule, extract events
  (title, date, time, place, cost, link) with an LLM, and put them in a review
  queue. Store facts only; link out for descriptions and posters. Respect
  robots.txt and offer same-day removal.
- **Community submission.** A short form for events the collector can't reach
  (Facebook/WhatsApp-only mandirs). Reviewed before publishing.
- **Listing page.** Events by postcode and date, filterable by type, with a
  source label (collected / submitted / posted by the mandir). No account to
  browse.
- **Festival join.** Upcoming festivals (dates from a validated calendar, not a
  homegrown engine at first), each linking to the local events marking it.
- **Weekly digest.** An email — and later WhatsApp — "this week near you" for a
  chosen postcode. This is the retention mechanism, not a daily panchang.

### Out of v1

In-page booking, payments, ticketing, accounts, native app, our own panchang
engine, Facebook/Instagram scraping (Meta's terms prohibit it).

### Success and kill criteria

| Measure | Target by end of first 3 months in the two clusters |
|---|---|
| Mandirs in clusters with at least one current event listed | ≥ 70% |
| Listings found wrong after publishing | < 5% |
| Manual review time | < 4 hours a week |
| Digest subscribers | 500 |
| Digest open rate | ≥ 40% |

If coverage stays under 40% because events live only on WhatsApp and Facebook,
collection isn't the answer and the product should pivot to the mandir-side
tool (Function 2) as the way listings get created.

---

## Function 2 — Seva rota (mandirs)

**The job:** "Fill the Janmashtami shifts without forty WhatsApp messages, and
see on Thursday which ones are still short."

**Why this one:** it is the clearest unserved operational need. UK mandirs run
rotas in WhatsApp and spreadsheets; ChurchSuite is generic and priced per
person; Indian temple ERPs are built for darshan and pooja bookings. It is also
the reason a committee claims its listing, and the most plausible thing a large
mandir would later pay for.

### v1 scope

- **Claim your mandir.** Verify a mandir account (email on the mandir's own
  domain, or a call to the published number).
- **Post a shift.** Role, date, time, slots needed, minimum age, contact. Copy
  last year's rota in one click.
- **Sign up.** Volunteers book a slot with name, email and phone. Calendar file
  and reminder.
- **Live roster.** Which shifts are short, shareable as a link to drop into the
  mandir's WhatsApp group.
- **Confirm hours afterwards.** One action by the named coordinator. This builds
  the volunteering record as a by-product; the formal certificate waits until a
  DofE centre or university has said what it would accept.

### Out of v1

Points or rewards of any kind, donations, Gift Aid, DBS checks (the mandir
keeps that responsibility; say so plainly).

### Open decisions

- **Age limit.** The brief says 16+, which excludes most DofE Bronze (14+) and
  Silver (15+) participants. Get safeguarding advice before choosing.
- **Special category data.** A seva sign-up at a mandir implies religion under
  UK GDPR. Needs explicit consent wording and a DPIA before launch.

### Success criteria

Five mandirs run one festival rota through it, and at least three use it again
for the next one without being asked.

---

## Build order

1. **Validate first (2 weeks, no code).** Audit 30 mandir websites in the two
   clusters for current, extractable events. Talk to five committee secretaries
   about rotas. Contact Hindu Events UK about partnering.
2. **Function 1, collection pipeline and listing page** — only if the audit
   shows enough events are online.
3. **Function 2, seva rota** — piloted with the mandirs met in step 1.
4. **Weekly digest**, once listings are reliable.
5. **Later:** own panchang engine, bookings, verified seva certificate, paid
   tier for large mandirs.
