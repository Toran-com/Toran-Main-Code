# Legal drafts

**Status: drafts for the founders to review. Not legal advice, and not
yet checked by a solicitor. The privacy notice and terms are on the site
(`/privacy`, `/terms`) marked as drafts, with every [bracket] highlighted.**

These cover what Toran does with personal data and the rules for using the
site. Decision 0006 says no personal data from the public (digest, rota)
is collected until the company is registered with the ICO and the DPIA is
done. This folder is the paperwork for that.

| File                                   | What it is                                                      | Published where                            |
| -------------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| [privacy-notice.md](privacy-notice.md) | What we collect, why, who we share it with, people's rights     | `/privacy`, shown from this file           |
| [terms.md](terms.md)                   | Rules for using the site and for committees adding information  | `/terms`, shown from this file             |
| [dpia.md](dpia.md)                     | Data protection impact assessment: risks and how we reduce them | Internal; shown to the ICO if asked        |
| [retention.md](retention.md)           | How long each kind of data is kept, and how it is deleted       | Internal; summarised in the privacy notice |

Text in **[square brackets]** needs filling in or checking. Search for `[`
before publishing anything.

## What to do, in order

1. **Company details.** Once the company is registered (decision 0007),
   fill in its name, number and registered office everywhere below.
2. **ICO registration** in the company's name: ico.org.uk → "Pay the data
   protection fee". About £50 a year for a small company [check the
   current tier]. Put the registration number in the privacy notice.
3. **A privacy contact address**, e.g. `privacy@<domain>`, that both
   founders can read. Requests must be answered within a month.
4. **Read the DPIA together** and agree the open actions at its end. The
   most important: how we meet the special category condition for
   committee members (section 5).
5. **Get a review.** The ICO has a free helpline and a small business hub
   (ico.org.uk/for-organisations/advice-for-small-organisations). A
   solicitor's fixed-fee review of the privacy notice and terms is worth
   it before the public digest or rota launch.
6. **Mark them checked.** The site shows these two files as they are, at
   `/privacy` and `/terms` (linked from every page's footer, and from the
   login, claim and "Tell us" pages), with a draft notice and the
   [brackets] highlighted. Once the text is agreed and every bracket is
   filled in, set `legalChecked: true` in `lib/site.ts`; a test refuses
   that while any bracket is left. Put Toran's email address in
   `CONTACT_EMAIL` in the same file, and the contact page shows it.

## Review dates

Look at all four again whenever we start collecting something new (the
digest, the rota, WhatsApp automation, AI extraction), and at least once a
year.
