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
- **ICO fee paid** as a sole trader trading as Toran (November 2026).
- **Contact addresses:** `privacy@toran.org.uk` in the privacy notice and
  `hello@toran.org.uk` in the terms. They must forward somewhere Milan
  reads before these pages are final (Namecheap → Domain List → Manage →
  Redirect Email).

## Blanks left (only Milan can answer)

Everything else in these drafts has been checked against the site and the
providers' own terms (12 November 2026).

1. **The business address** to show in the privacy notice and terms.
   The law needs one for a business website; a business address service
   works if you'd rather not show a home address.
2. **The ICO registration number** (two letters and six digits, from the
   ICO's confirmation email or certificate; not the application number).
3. **Regions**, each a quick look in its settings:
   - Supabase → the live project → Settings → General: "Region" (we want
     London, `eu-west-2`);
   - Sentry: the error reporting address (`NEXT_PUBLIC_SENTRY_DSN` in
     Vercel) contains `ingest.de.sentry.io` for the EU; anything else
     (`ingest.us.sentry.io` or `ingest.sentry.io`) is the USA;
   - Resend → Domains: the region shown for the sending domain.
4. **Data processing agreements:** accept Anthropic's, Resend's,
   Supabase's, Vercel's and Sentry's for Toran's accounts (each is in the
   provider's legal or settings pages).
5. **The date** to sign off the DPIA, and who leads in the breach plan.
6. **A solicitor's review** of the privacy notice and terms (two
   bracketed notes in the terms), and the ICO helpline call before the
   weekly email is switched on.

## What to do, in order

1. **Fill in the address and the ICO number** in the privacy notice and
   terms.
2. **Set up the two addresses** on the domain and check they arrive.
3. **Read the DPIA** and do the open actions at its end. Committee
   members' explicit consent (section 5) is built: a separate box when
   they ask to look after a page or accept an invite. Families' explicit
   consent is built too: a separate, unticked box on My Toran before
   anything is kept on their account.
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
