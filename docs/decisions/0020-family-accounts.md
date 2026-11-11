# 0020. A Log in for everyone, and family accounts built but switched off

Date: 2026-11-11
Status: Proposed

## Context

Logging in was only for mandir committees, and it was hard to find: a
"Committee log in" line inside the menu. The founders want a Log in
button on every page, leading to a choice between logging in as a family
or as a mandir, and creating a mandir's account to be encouraged much
more.

Families have needed no account so far (decision 0006): what they follow
and plan is kept on their phone, and "Moving to a new phone" copies it
across. A family account means keeping an email address next to the
mandirs someone follows, which can reveal their religion (special
category data). Decision 0006 says to register with the ICO and complete
the DPIA before collecting personal data like this.

## Decision

- **Log in on every page.** A gold "Log in" button in the header; a
  person in a circle ("Your account") once logged in. On phones under
  430px wide the header's Search moves into the menu to make room; on the
  narrowest phones "Log in" is the person too.
- **One way in, two doors (/login).** "For families" and "For mandir
  committees", side by side on a laptop. The mandir door leads with
  "Create your mandir's account, free" and what it gives a committee,
  then the log-in form for existing accounts. Logging in stays an emailed
  link (decision 0010).
- **Family accounts, built and switched off.** With
  `NEXT_PUBLIC_FAMILY_ACCOUNTS=on`, the family door logs families in and
  My Toran keeps their followed mandirs and plan on their account
  (`family_saved`), the same on every device: the first time a device
  meets the account the two are put together; after that the account is
  the record. Only slugs and event ids with dates are kept, at most 30 of
  each; only the family itself can read or change them (row level
  security); they can delete them or close the account from /account;
  lists unchanged for 2 years are deleted by the nightly clean-up.
  Committee and admin accounts can't be closed from the site (they're
  tied to mandirs' pages).
- **While it's off** (the default, and the live site until the ICO
  registration and DPIA are done) the family door says no account is
  needed and opens My Toran; nothing new is collected.

## Consequences

Committees find the way in from any page, and the case for creating a
mandir's account is made where people choose. Switching family accounts
on later needs no code: register with the ICO, add family accounts to
the DPIA and the privacy notice ("Coming later" already describes them),
set the variable for Production in Vercel and redeploy. Seva slots and
"I went" stay on the phone only, even with an account.
