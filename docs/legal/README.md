# Legal drafts

**Status: drafts for Milan to review. Not legal advice, and not
yet checked by a solicitor. The privacy notice and terms are on the site
(`/privacy`, `/terms`) marked as drafts, with every [bracket] highlighted.**

These cover what Toran does with personal data and the rules for using the
site. Toran is run by Milan Patel as a sole trader (decision 0021), who
is the controller. Decision 0006 says no personal data from the public
(digest, rota, family accounts) is collected until Toran is registered
with the ICO and the DPIA is done. This folder is the paperwork for that.

| File                                   | What it is                                                      | Published where                            |
| -------------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| [privacy-notice.md](privacy-notice.md) | What we collect, why, who we share it with, people's rights     | `/privacy`, shown from this file           |
| [terms.md](terms.md)                   | Rules for using the site and for committees adding information  | `/terms`, shown from this file             |
| [dpia.md](dpia.md)                     | Data protection impact assessment: risks and how we reduce them | Internal; shown to the ICO if asked        |
| [retention.md](retention.md)           | How long each kind of data is kept, and how it is deleted       | Internal; summarised in the privacy notice |
| [breach-plan.md](breach-plan.md)       | What to do, step by step, if personal data leaks                | Internal                                   |

Text in **[square brackets]** needs filling in or checking. Search for `[`
before publishing anything.

## Done

- **Who runs Toran:** Milan Patel, sole trader, trading as Toran
  (decision 0021). Registered with HMRC as self-employed.
- **Registered with the ICO** as a sole trader trading as Toran:
  registration number ZC300728 (November 2026), paid by direct debit.
- **Business address:** 1G Bartholomews, Brighton BN1 1HG.
- **Contact addresses:** `privacy@toran.org.uk` (privacy notice, contact
  page) and `hello@toran.org.uk` (terms, contact page), both forwarded to
  Milan's inbox, and replies sent as hello@toran.org.uk.
- **Sentry's region:** EU (Germany): the live site sends error reports to
  `ingest.de.sentry.io`.

## Blanks left (only Milan can answer)

Everything else in these drafts has been checked against the site and the
providers' own terms (12 November 2026).

1. **Two regions**, each a quick look in its settings:
   - Supabase → the live project → Settings → General: "Region" (we want
     London, `eu-west-2`);
   - Resend → Domains: the region shown for toran.org.uk, once the domain
     is added there (login emails need it: go-live checklist, step 3).
2. **Data processing agreements:** accept Anthropic's, Resend's,
   Supabase's, Vercel's and Sentry's for Toran's accounts (each is in the
   provider's legal or settings pages).
3. **The date** to sign off the DPIA, and who leads in the breach plan.
4. **A solicitor's review** of the privacy notice and terms (two
   bracketed notes in the terms), and the ICO helpline call before the
   weekly email is switched on.

## What to do, in order

1. **Fill in the address and the ICO number** in the privacy notice and
   terms.
2. **Set up the two addresses** on the domain and check they arrive.
3. **Read the DPIA** and do the open actions at its end. Committee
   members' explicit consent (section 5) is built: a separate box when
   they ask to look after a page or accept an invite. Families' explicit
   consent isn't built yet, and must be before family accounts are
   switched on.
4. **Get a review.** The ICO has a free helpline and a small business hub
   (ico.org.uk/for-organisations/advice-for-small-organisations). A
   solicitor's fixed-fee review of the privacy notice and terms is worth
   it before the public digest, family accounts or rota launch.
5. **Mark them checked.** The site shows these two files as they are, at
   `/privacy` and `/terms` (linked from every page's footer, and from the
   login, claim and "Tell us" pages), with a draft notice and the
   [brackets] highlighted. Once the text is agreed and every bracket is
   filled in, set `legalChecked: true` in `lib/site.ts`; a test refuses
   that while any bracket is left. Put `hello@toran.org.uk` in
   `CONTACT_EMAIL` in the same file once it forwards, and the contact page
   shows it.

## Review dates

Look at all four again whenever we start collecting something new (the
digest, family accounts, the rota, WhatsApp automation, AI extraction), and at least once a
year.
