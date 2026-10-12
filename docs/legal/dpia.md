# Data protection impact assessment (DRAFT)

> Draft for review, [date]. Prepared from the code and decisions as they
> stand in pull requests 2 to 11. Follows the structure of the ICO's DPIA
> template. To be agreed and signed by both founders before any public
> personal data is collected (decision 0006).

## 1. Why we're doing a DPIA

Toran's purpose is connecting people with Hindu mandirs. Almost anything
that links a person to a mandir can reveal their **religious beliefs**,
which is special category data (UK GDPR Article 9). The rota will also
involve **children** who volunteer. Either is reason enough to do a DPIA
before starting; together they make it essential.

This DPIA covers what is built now (committee logins and mandir pages) and
what is planned for v1 (weekly digest, seva rota, forwarding posters by
WhatsApp and email, AI reading of posters). Sections marked **planned**
must be re-checked before that feature is built.

## 2. The processing

### What we collect, from whom

| People                      | Data                                                                                               | Status                            |
| --------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- |
| Visitors                    | None stored by us. IP addresses in the hosting provider's short-lived logs                         | Now                               |
| Committee members           | Email, login history, role at the mandir, a note, which mandirs they manage, events they confirmed | Now                               |
| Toran admins (the founders) | As above, plus an authenticator app link                                                           | Now                               |
| Mandir contacts             | Organisation email or phone (sometimes a named person's), from public sources and outreach         | Now                               |
| Digest subscribers          | Email and postcode                                                                                 | Planned                           |
| Rota volunteers             | Name, one contact detail, age band; for under-16s a parent's or guardian's details                 | Planned                           |
| People forwarding posters   | Phone number or email, the message and images                                                      | Pilot by hand; planned automation |

### How it flows

- Committee members log in by emailed link (Supabase Auth). Their request
  to manage a mandir goes to a review list only Toran admins can see, and
  only after entering an authenticator code.
- Event details they add are public; who added them is not.
- **Planned:** digest emails go out weekly from an email provider. Rota
  sign-ups are visible only to that mandir's admins. Forwarded posters are
  read (by a person now, by the Claude API later) into draft listings for
  the mandir to confirm.

### Scale and context

Pilot: about 30 mandirs, a few dozen committee members, up to about 1,000
digest subscribers. Most people are adults; some rota volunteers will be
under 18. People would expect a community events service to know their
email address, but not to keep or share where they worship. The UK has had
attacks on places of worship, so lists of named worshippers or volunteers
would be sensitive.

### Purposes

Show accurate, up-to-date mandir events; let committees keep their own
listing right; later, tell subscribers what's on nearby and help mandirs
fill seva shifts.

## 3. Consultation

- Mandir committees: through the pilot outreach (October 2026 onwards).
  Ask what they'd be comfortable with volunteers' data, and who on the
  committee should see rota sign-ups.
- [ICO small business helpline, before the digest launches.]
- [A solicitor's review of the privacy notice and terms.]

## 4. Necessity and proportionality

- **Browsing needs no account**, and we don't track visitors.
- **The digest needs only an email and a postcode**, not a name, and not
  which mandir someone attends. Postcodes can be cut to the district (e.g.
  `HA9`) [decide: full postcode or district only].
- **Rota sign-ups need a name and one contact**, seen only by that mandir.
- We don't store which mandir anyone "belongs to".
- Every table with personal data has a retention period (retention.md).
- Database rules (row-level security) enforce who sees what, tested on
  every change (supabase/tests/database).

## 5. Lawful basis

| People                    | Article 6 basis                                      | Article 9 condition (special category)                                                                                             |
| ------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Committee members         | Contract (providing the login and page they ask for) | **Explicit consent**, given when asking to manage a page. **Action:** add a separate consent box to the claim form (see section 8) |
| Digest subscribers        | Consent (and PECR consent for marketing-style email) | **Explicit consent** at sign-up, as subscribing implies an interest in Hindu worship                                               |
| Rota volunteers           | Consent, or legitimate interests of the mandir       | **Explicit consent** at sign-up; for under-13s a parent's consent [check age rules with a solicitor]                               |
| People forwarding posters | Legitimate interests (publishing a mandir's event)   | Usually none: the content is the mandir's public event. Avoid storing personal content beyond what's needed                        |
| Mandir contacts           | Legitimate interests (contacting the organisation)   | Usually none: organisational contact                                                                                               |

Article 9(2)(d) (not-for-profit religious bodies) doesn't apply: Toran is a
company, not the mandir. Mandirs themselves may rely on it for their own
records, which is one more reason Toran holds as little as possible.

## 6. Risks

Likelihood and severity: low, medium or high. "Overall" is before the
measures in section 7.

| #   | Risk to individuals                                                                                             | Likelihood | Severity | Overall |
| --- | --------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------- |
| R1  | A breach exposes committee members' emails and roles, revealing their religion                                  | Low        | Medium   | Medium  |
| R2  | Someone falsely claims a mandir and posts false or harmful events (e.g. luring people to a wrong place or time) | Medium     | High     | High    |
| R3  | Rota lists leak or are misused, revealing named volunteers (some children) at a named mandir                    | Low        | High     | Medium  |
| R4  | Children's data is collected without proper consent or safeguards                                               | Medium     | High     | High    |
| R5  | Data is kept longer than needed                                                                                 | Medium     | Low      | Medium  |
| R6  | Data held by US-based providers is accessed under foreign law                                                   | Low        | Medium   | Low     |
| R7  | Error reports or logs capture personal data                                                                     | Medium     | Low      | Low     |
| R8  | Forwarded WhatsApp messages mix personal and Toran data on a founder's personal phone                           | High       | Low      | Medium  |
| R9  | Posters or messages sent to an AI service are kept or used for training                                         | Low        | Medium   | Low     |
| R10 | A founder's account (GitHub, Supabase, Vercel, Gmail) is taken over                                             | Low        | High     | Medium  |

## 7. Measures

| Risk | Measures (✅ built, ☐ to do)                                                                                                                                                                                                                                                   | Residual |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| R1   | ✅ Row-level security on every table, tested for each role; ✅ the site uses only the public key, never the service key; ✅ admin powers need an authenticator code (`aal2`) in the database itself; ✅ London-region database; ☐ breach response plan (72-hour ICO reporting) | Low      |
| R2   | ✅ Every claim is checked with the mandir before approval; ✅ public pages never show who posted; ✅ events are never deleted, so changes can be traced; ✅ mandirs can have access removed and pages hidden the same day; ☐ admin "remove this person" button                 | Medium   |
| R3   | ☐ Sign-ups visible only to that mandir's admins (enforced by database rules, with tests); ☐ no public names; ☐ deleted 90 days after the event                                                                                                                                 | Low      |
| R4   | ☐ Age band asked at sign-up; ☐ under-16s need a parent's details and the mandir's sign-off; ☐ DBS checks stay with the mandir (Toran only marks "needs DBS"); ☐ solicitor check on age-of-consent rules                                                                        | Medium   |
| R5   | ✅ Retention schedule; ☐ deletion jobs before each feature launches; ☐ quarterly review until then                                                                                                                                                                             | Low      |
| R6   | ✅ Database and hosting functions in London; ☐ check each provider's data processing agreement and transfer mechanism; ☐ Sentry EU region                                                                                                                                      | Low      |
| R7   | ✅ Sentry set up to drop IP addresses, cookies, headers and user details, and to scrub email addresses from messages (tested); ✅ no personal data in URLs                                                                                                                     | Low      |
| R8   | ✅ Decision 0008: a separate company number before automation; ☐ delete forwards from the phone once entered; ☐ don't forward them on                                                                                                                                          | Low      |
| R9   | ☐ Use an API plan whose terms exclude training on our data, with short retention [check Anthropic's commercial terms]; ☐ send only the poster, not the sender's details                                                                                                        | Low      |
| R10  | ☐ Two-factor login on every founder account; ☐ company accounts, not personal ones (decision 0007); ✅ secrets never in the repo; ✅ database changes only through reviewed migrations                                                                                         | Low      |

## 8. Actions before the pilot

1. Register with the ICO; add the number to the privacy notice.
2. Add a separate, unticked **explicit consent** box to the claim form,
   for example: "I agree that Toran can record that I help run this
   mandir. This may show my religion. I can withdraw this at any time."
   Store when consent was given.
3. Write a one-page breach response plan: who decides, how to tell the
   ICO within 72 hours, and how to tell the people affected.
4. Set up the privacy email address; publish `/privacy` and `/terms`.
5. Turn on two-factor login for every founder account.
6. Check each provider's data processing agreement and transfer terms;
   fill in the processor table in the privacy notice.

Before the digest and rota launch: redo sections 4 to 7 for them, decide
postcode precision, and settle the children's consent rules.

## 9. Sign-off

| Item                       | Name   | Date   | Notes                                                            |
| -------------------------- | ------ | ------ | ---------------------------------------------------------------- |
| Measures approved by       | [name] | [date] |                                                                  |
| Residual risks approved by | [name] | [date] | If any residual risk stays high, consult the ICO before starting |
| Next review                |        | [date] | Before the digest launches, and yearly                           |
