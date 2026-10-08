# Launch plan — October 2026 to March 2027

For one founder with a full-time job (07:30–16:30), 1–2 hours on weekday
evenings, and Fridays and weekends free for visits. Based in Brighton.

The plan has one rule: **prove people want it before building it.** Everything
until mid-December is done by hand, with no new code. If people won't open a
hand-made weekly email, they won't use an app.

---

## Step 0 — This week (4–10 Oct): set up properly

1. **Check your employment contract** for clauses on outside work,
   intellectual property and conflicts of interest. Some contracts give the
   employer rights to things you build. Fix this first; it is the one mistake
   that's hard to undo.
2. **Decide your pilot area.** North-west London (Harrow, Wembley, Kenton) is
   the strongest cluster and about two hours from Brighton by train. Leicester
   is about three hours, so treat it as a second cluster later. Also check
   Croydon and Crawley: both are much closer to Brighton and may have enough
   mandirs for a convenient first test.
3. **Set up a simple workspace:** one notes page per mandir (a Notion
   database works), this repo for documents and code, and a separate email
   address for the project.
4. **Write down your hypotheses** (below) so you can't move the goalposts
   later.
5. **Don't register a company, buy branding or build an app yet.** "Utsav" is
   a working name only.

### Hypotheses to test

| # | Hypothesis | Passes if |
|---|---|---|
| H1 | People want one place for what's on at mandirs near them | 150+ people subscribe to a hand-made weekly email in 6 weeks, with 40%+ opening it |
| H2 | Enough events can be found without the mandirs doing anything | You can find current events for 70%+ of mandirs in the pilot area each week |
| H3 | Mandirs struggle with seva rotas and would use a simple tool | 3 of 8 committees you speak to agree to try a shared sign-up link for a real event |
| H4 | Young people (16–30) are a reachable audience | 30%+ of subscribers are under 30, or under-30s ask for it unprompted |

---

## Step 1 — Navratri and Diwali (11 Oct – 15 Nov): learn in the field

This is the busiest month of the Hindu year, and it's happening now. It's the
best time to watch how things really work, and the worst time to ask
committees for meetings. So **observe and talk to attendees now; book
committee meetings for after Diwali.**

**Weekends and Fridays (visits):**

- Visit 2–3 mandirs per weekend during Navratri (11–19 Oct) and around Diwali
  (8 Nov). Look at how events are announced: posters, notice boards, WhatsApp
  QR codes, word of mouth. Photograph notice boards (ask first).
- Have short conversations with attendees, especially under-30s and parents.
  Ask about what they did, not what they'd like: *"How did you find out about
  tonight?"*, *"What did you miss last year because you didn't know about
  it?"*, *"Which WhatsApp groups do you get mandir news from?"*
- Introduce yourself to whoever runs volunteers. Don't pitch. Ask: *"How did
  you organise volunteers for tonight?"* and ask if you can come back after
  Diwali for 20 minutes.

**Weekday evenings (1–2 hours):**

- Run the website audit (`audit/README.md`) and fill in the 19 missing
  websites by hand.
- **Start the hand-made weekly email** for the pilot area. Every Wednesday
  evening, collect events from mandir websites, Facebook pages and posters you
  photographed. Send it on Thursday. Free tools are fine (Buttondown,
  Substack or Mailchimp's free tier). This *is* the product test (H1, H2).
- Share it through people you meet, youth groups and university Hindu
  societies (NHSF chapters). Track subscribers, opens and forwards in a
  spreadsheet.
- Write up each conversation the same evening, while you remember it.

**Targets by 15 Nov:** 20+ attendee conversations, 6 weekly emails sent, a
first count of subscribers, and 8 committee meetings booked for after Diwali.

---

## Step 2 — Committees and a manual seva test (16 Nov – 20 Dec)

- **Meet 8 mandir committees** (secretaries, seva coordinators, youth leads).
  Fridays and Sunday mornings after aarti usually work best. Show the
  prototype on your phone, then listen. Ask how they run rotas today, what
  went wrong at Navratri, and who decides about new tools.
- **Run one rota by hand.** Offer one mandir a free shared sign-up for a real
  upcoming event (a Google Form plus a sheet you manage). You do the work;
  they get the result. This tests H3 without code.
- **Talk to one DofE manager at a school and one university Hindu society** to
  learn what volunteering evidence they actually accept.
- **Contact Hindu Events UK** to explore partnering rather than competing.
- **Keep sending the weekly email.**

### Decision point — week of 14 Dec

Score each hypothesis pass or fail, and write the decision down:

- **H1 and H2 pass:** build Function 1 (events + digest) first.
- **H1 passes, H2 fails:** events live on WhatsApp/Facebook, so collection
  won't work. Build the mandir side first (rota and claiming), so mandirs
  create the listings.
- **H3 passes strongly:** the seva rota may be the better first product.
- **H1 fails:** stop and rethink before spending more time. That is a good
  outcome, not a failure. You'll have learned it in 10 weeks instead of a year.

---

## Step 3 — Foundations in parallel (from November, ~1 hour a week)

None of these block the field work, but all must be done before a public
launch.

- **Data protection:** register with the ICO (small annual fee) once you hold
  subscriber data in any volume. Write a privacy notice. Seva sign-ups at a
  mandir reveal religion, which is special category data under UK GDPR, so
  this needs a Data Protection Impact Assessment and explicit consent.
- **Safeguarding:** get advice from someone who knows charity safeguarding
  before any under-18 can book seva. Decide the minimum age from that advice.
- **Name:** check trademarks (UK IPO search) and domain availability before
  you commit to a name.
- **Structure:** decide later between a limited company and a Community
  Interest Company (CIC). A CIC can apply for community grants (such as
  National Lottery Awards for All) that a normal company can't. Revisit at the
  decision point.
- **Accounts:** a separate bank account and a simple record of costs from day
  one.

---

## Step 4 — Build v1 (January – February 2027)

Only after the decision point, and only the winning function. Build it with
Claude Code in this repo, with you deciding scope and testing every change.

- **If events first:** the mandir source list, website collection with a
  review queue you approve, a listings page for the pilot area, and the weekly
  email generated from the same data. You keep reviewing every listing by hand
  at first.
- **If seva first:** claim-your-mandir, post shifts, a shareable sign-up link,
  reminders and hour confirmation. Pilot with the mandirs from Step 2.
- **Budget:** under £50 a month (domain, hosting free tiers, email sending,
  a small amount of AI extraction).
- **Before go-live:** privacy notice, removal-on-request policy, and festival
  dates checked by a panditji.

---

## Step 5 — Launch in the pilot area (March 2027 onward)

- Launch around a festival (Holi, or Ram Navami in spring) so there's a reason
  to visit.
- Measure against the success criteria in `docs/core-functions.md`: coverage,
  error rate, review time, subscribers, open rate, repeat use by mandirs.
- Only then add a second cluster (Leicester), and only then think about
  revenue: grants, a paid tier for large mandirs, or donations.

---

## Weekly rhythm

| When | What | Time |
|---|---|---|
| Mon evening | Plan the week; send outreach messages; book visits | 1 h |
| Tue evening | Write up conversations; foundations work | 1–1.5 h |
| Wed evening | Collect events for the weekly email | 1.5–2 h |
| Thu evening | Send the email; update the metrics sheet | 45 min |
| Fri / Sat / Sun | Mandir visits (one cluster per weekend), conversations | 4–8 h |
| Last Sunday of the month | Review hypotheses and numbers; adjust the plan | 1 h |

About 6 hours on weekday evenings plus a visit day: roughly 12–14 hours a
week. Take one weekend in four off. This is a six-month effort before launch,
and burning out in month two is the most common way a side project dies.

## Using Claude well

- Keep everything in this repo so each session starts with full context.
- Good jobs for Claude: drafting interview scripts and outreach messages,
  turning your notes into findings, building the weekly email template,
  running the audit, and later writing and testing the code.
- Jobs only you can do: the conversations, the relationships with
  committees, and the decisions at each gate.
