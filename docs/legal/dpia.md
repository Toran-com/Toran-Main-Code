# Data protection impact assessment (DRAFT)

> Draft of 12 November 2026, brought up to date with the site as built
> (all features merged by that date, including family accounts). Follows
> the structure of the ICO's DPIA template. To be signed by Milan Patel,
> who runs Toran as a sole trader and is the controller (decision 0021),
> before any public personal data is collected (decision 0006).

## 1. Why we're doing a DPIA

Toran's purpose is connecting people with Hindu mandirs. Almost anything
that links a person to a mandir can reveal their **religious beliefs**,
which is special category data (UK GDPR Article 9). A seva rota with names
would also involve **children** who volunteer. Either is reason enough to
do a DPIA before starting; together they make it essential.

This DPIA covers what is built now and what is planned. Sections marked
**planned** must be re-checked before that feature is switched on.

## 2. The processing

### What we collect, from whom

| People                      | Data                                                                                                             | Status                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Visitors                    | None stored by us. IP addresses in the hosting provider's logs for 1 hour to 1 day                               | Now                                        |
| Visitors taking seva slots  | Nothing about the person: only that one more place is taken                                                      | Now                                        |
| Committee members           | Email, login history, role at the mandir, a note, which mandirs they manage, events they confirmed, consent time | Now                                        |
| Toran admins (the founders) | As above, plus an authenticator app link                                                                         | Now                                        |
| Mandir contacts             | Organisation email or phone (sometimes a named person's), from public sources and outreach                       | Now                                        |
| People in mandir photos     | None intended: photos must show the building only, with no people                                                | Now                                        |
| Weekly email subscribers    | Email and an optional area (such as "London")                                                                    | Built, switched off until ICO registration |
| Families with an account    | Email, login history, the mandirs they follow (web addresses) and their plan (event codes and dates), 30 of each | Built, switched off (decision 0020)        |
| Committee members (email)   | A monthly summary of their page, sent to their login email                                                       | Preview only; nothing sends it             |
| Seva volunteers by name     | Name, one contact detail, age band; for under-16s a parent's or guardian's details                               | Planned, not built                         |
| People forwarding posters   | Phone number or email, the message and images                                                                    | Pilot by hand; planned automation          |

### How it flows

- Committee members log in by emailed link (Supabase Auth). Their request
  to manage a mandir goes to a review list only Toran admins can see, and
  only after entering an authenticator code.
- Event details they add are public; who added them is not.
- Visitors' own choices (mandirs followed, plans, seva taken, text size)
  stay in their browser. Nothing links them to a person on our side.
- A poster photo sent to be read goes to the Claude API (Anthropic) with
  an instruction to leave out names and numbers; only the event details
  come back, as drafts for a person to check. The picture isn't stored.
- Mandir photos are uploaded by the mandir's committee (or Toran) to a
  public storage bucket only they can write to.
- **When switched on:** weekly emails go out through Resend. Sign-ups are
  readable only by the sending job's secret key, not by any person
  through the site.
- **Family accounts, when switched on:** a family logs in by emailed link
  from the family door on /login. What My Toran already keeps on their
  phone (mandirs followed, their plan) is then also saved to their
  account (`family_saved`), so it appears on their other devices. Only
  they can read or change it (row level security); mandirs and Toran's
  pages never see it. They can delete it, or close the account, from
  /account; lists unchanged for 2 years are deleted every night.

### Scale and context

Pilot: about 30 mandirs, a few dozen committee members, up to about 1,000
weekly email subscribers, and (once switched on) family accounts in the
hundreds. Most people are adults. People would expect a
community events service to know their email address, but not to keep or
share where they worship. The UK has had attacks on places of worship, so
lists of named worshippers or volunteers would be sensitive.

### Purposes

Show accurate, up-to-date mandir events; let committees keep their own
listing right; tell subscribers what's on nearby; help mandirs fill seva
shifts; let families who choose to have an account see their mandirs and
plan on every device.

## 3. Consultation

- Mandir committees: through the pilot outreach (October 2026 onwards).
  Ask what they'd be comfortable with, and whether any need named seva
  sign-ups at all.
- [ICO small business helpline: before the weekly email is switched on.]
- [A solicitor's review of the privacy notice and terms: before launch.]

## 4. Necessity and proportionality

- **Browsing needs no account**, and we don't track visitors. Visit
  numbers are page totals only.
- **Seva needs no names**: Toran counts places taken and nothing else.
- **The weekly email needs only an email address**, with an optional
  area, not a postcode, name, or which mandir someone attends.
- We don't store which mandir anyone "belongs to". Following a mandir
  stays on the visitor's phone, unless a family chooses an account to
  have it on every device; then only the list itself is kept (no names,
  postcodes or history), at most 30 mandirs and 30 planned events, and
  only they can see it. Everything works without an account.
- Every table with personal data has a retention period (retention.md).
- Database rules (row-level security) enforce who sees what, tested on
  every change (supabase/tests/database).

## 5. Lawful basis

| People                    | Article 6 basis                                      | Article 9 condition (special category)                                                                                         |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Committee members         | Contract (providing the login and page they ask for) | **Explicit consent**: a separate, unticked box when asking to manage a page or accepting an invite, with the time stored       |
| Weekly email subscribers  | Consent (and PECR consent for email)                 | **Explicit consent** at sign-up, as subscribing implies an interest in Hindu worship                                           |
| Families with an account  | Contract (keeping the lists they ask us to keep)     | **Explicit consent**: a separate, unticked box before anything is saved to the account, with the time stored [not built yet]   |
| Seva volunteers by name   | Consent, or legitimate interests of the mandir       | **Explicit consent** at sign-up; for under-13s a parent's consent [check age rules with a solicitor before this is ever built] |
| People forwarding posters | Legitimate interests (publishing a mandir's event)   | Usually none: the content is the mandir's public event. Avoid storing personal content beyond what's needed                    |
| Mandir contacts           | Legitimate interests (contacting the organisation)   | Usually none: organisational contact                                                                                           |

Article 9(2)(d) (not-for-profit religious bodies) doesn't apply: Toran is a
business (run by a sole trader), not the mandir. Mandirs themselves may rely on it for their own
records, which is one more reason Toran holds as little as possible.

## 6. Risks

Likelihood and severity: low, medium or high. "Overall" is before the
measures in section 7.

| #   | Risk to individuals                                                                                             | Likelihood | Severity | Overall |
| --- | --------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------- |
| R1  | A breach exposes committee members' emails and roles, revealing their religion                                  | Low        | Medium   | Medium  |
| R2  | Someone falsely claims a mandir and posts false or harmful events (e.g. luring people to a wrong place or time) | Medium     | High     | High    |
| R3  | Named seva lists leak or are misused, revealing named volunteers (some children) at a named mandir              | Low        | High     | Medium  |
| R4  | Children's data is collected without proper consent or safeguards                                               | Medium     | High     | High    |
| R5  | Data is kept longer than needed                                                                                 | Medium     | Low      | Medium  |
| R6  | Data held by US-based providers is accessed under foreign law                                                   | Low        | Medium   | Low     |
| R7  | Error reports or logs capture personal data                                                                     | Medium     | Low      | Low     |
| R8  | Forwarded WhatsApp messages mix personal and Toran data on a founder's personal phone                           | High       | Low      | Medium  |
| R9  | Posters sent to an AI service are kept, used for training, or have names read into public listings              | Low        | Medium   | Low     |
| R10 | A founder's account (GitHub, Supabase, Vercel, Gmail) is taken over                                             | Low        | High     | Medium  |
| R11 | A mandir photo shows identifiable people at worship, published without their knowledge                          | Medium     | Medium   | Medium  |
| R12 | The weekly email list leaks, linking people's emails to an interest in Hindu events                             | Low        | Medium   | Medium  |
| R13 | Family accounts leak or are misused, linking people's emails to the mandirs they follow (their religion)        | Low        | High     | Medium  |

## 7. Measures

| Risk | Measures (✅ built, ☐ to do)                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Residual |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| R1   | ✅ Row-level security on every table, tested for each role; ✅ the site uses only the public key, never the service key; ✅ admin powers need an authenticator code (`aal2`) in the database itself; ✅ London-region database and servers; ✅ breach response plan (breach-plan.md)                                                                                                                                                                                                 | Low      |
| R2   | ✅ Every claim is checked with the mandir before approval; ✅ public pages never show who posted; ✅ events are never deleted, so changes can be traced; ✅ Toran can remove a person's access and hide a page the same day; ✅ ticket and live stream links must be web addresses, checked by the database                                                                                                                                                                          | Medium   |
| R3   | ✅ Seva on Toran keeps no names at all, so there is no list to leak; ☐ if names are ever needed: visible only to that mandir's committee, deleted 90 days after the event                                                                                                                                                                                                                                                                                                            | Low      |
| R4   | ✅ No children's data is collected (seva keeps no names); ☐ if named sign-ups are ever built: age band, a parent's details for under-16s, the mandir's sign-off, and a solicitor's check first                                                                                                                                                                                                                                                                                       | Low      |
| R5   | ✅ Retention schedule with automatic deletion every night for invites, requests, unconfirmed and departed email sign-ups; ☐ quarterly review of logins until their job exists                                                                                                                                                                                                                                                                                                        | Low      |
| R6   | ✅ Database and hosting functions in London; ✅ Anthropic and Resend covered by data processing agreements [check each is signed or accepted for Toran's accounts]; ☐ Sentry EU region [check]                                                                                                                                                                                                                                                                                       | Low      |
| R7   | ✅ Sentry set up to drop IP addresses, cookies, headers and user details, and to scrub email addresses from messages (tested); ✅ no personal data in URLs; ✅ server logs kept 1 hour to 1 day                                                                                                                                                                                                                                                                                      | Low      |
| R8   | ✅ Decision 0008: a separate company number before automation; ☐ delete forwards from the phone once entered; ☐ don't forward them on                                                                                                                                                                                                                                                                                                                                                | Low      |
| R9   | ✅ Anthropic's commercial terms exclude training on our data and delete it within 30 days; ✅ only the poster is sent, never who sent it, with an instruction to leave out names and numbers; ✅ every event read is checked by a person before it's published                                                                                                                                                                                                                       | Low      |
| R10  | ☐ Two-factor login on every founder account; ☐ Toran's accounts on Toran's own email addresses, not personal mail (decision 0021); ✅ secrets never in the repo; ✅ database changes only through reviewed migrations                                                                                                                                                                                                                                                                | Low      |
| R11  | ✅ The committee must tick "a photo of the building with no people in it"; ✅ only that mandir's committee or Toran can add or remove it (database rules, tested); ✅ removal on request, at once                                                                                                                                                                                                                                                                                    | Low      |
| R12  | ✅ Switched off until ICO registration; ✅ only email and optional area kept; ✅ nobody can read the list through the site, only the sending job; ✅ links' secret codes stored only as hashes; ✅ leaving deletes the address at once                                                                                                                                                                                                                                               | Low      |
| R13  | ✅ Switched off until this DPIA is signed; ✅ optional: everything works without an account; ✅ only mandir web addresses and event codes kept, 30 of each, never names, postcodes or history; ✅ row level security: only the family can read or change its row (tested); ✅ never shown to mandirs or on any page; ✅ "Delete what's saved" and "Close my account" on /account, deleting at once; ✅ deleted after 2 years unchanged; ☐ explicit consent box before the first save | Low      |

## 8. Actions before the pilot

1. ✅ ICO fee paid, as a sole trader trading as Toran (November 2026);
   ☐ add the registration number to the privacy notice.
2. ✅ A separate, unticked **explicit consent** box when asking to manage
   a page or accepting an invite, with the time stored.
3. ✅ A one-page breach response plan (breach-plan.md): who decides, how
   to tell the ICO within 72 hours, and how to tell the people affected.
4. Set up the privacy email address; publish `/privacy` and `/terms` as
   final (`legalChecked: true` in `lib/site.ts`).
5. Turn on two-factor login for every founder account.
6. Check each provider's data processing agreement and transfer terms;
   fill in the regions in the privacy notice's processor table.

Before the weekly email is switched on: call the ICO helpline, and redo
sections 4 to 7 for it. Before family accounts are switched on: build the
explicit consent box (section 5), and sign this DPIA with them in it. Before any named seva sign-up is built: settle
the children's consent rules with a solicitor.

## 9. Sign-off

| Item                       | Name        | Date   | Notes                                                                  |
| -------------------------- | ----------- | ------ | ---------------------------------------------------------------------- |
| Measures approved by       | Milan Patel | [date] |                                                                        |
| Residual risks approved by | Milan Patel | [date] | If any residual risk stays high, consult the ICO before starting       |
| Next review                |             | [date] | Before the weekly email or family accounts are switched on, and yearly |
