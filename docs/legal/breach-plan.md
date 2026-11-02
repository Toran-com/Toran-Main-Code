# Breach response plan (DRAFT)

> Draft of 2 November 2026. What to do if personal data held by Toran is
> lost, leaked, wrongly changed, or seen by someone who shouldn't see it.
> Keep this short enough to follow in a hurry. DPIA section 8, action 3.

**Who decides:** [name] (lead), or [name] if they can't be reached within
a few hours. Either can start the steps below.

## 1. Contain it (the first hour)

- **A login or key may be known to someone else:** rotate it straight
  away. Supabase → Project Settings → API keys (make a new secret key,
  delete the old one, update `SUPABASE_SECRET_KEY` in Vercel and
  redeploy); Vercel and GitHub → change the password and sign out other
  sessions. Never paste keys into a chat.
- **A committee login is misused:** `/ops/mandirs/<mandir>` → "Remove
  access"; hide the mandir's page if false events are showing.
- **Something on the public site shouldn't be there** (a photo showing
  people, a personal phone number): remove it now, from the committee
  page or `/ops`.
- **The database itself may be exposed:** pause the project
  (Supabase → Project Settings → General → Pause), then think.

## 2. Write it down (the same day)

In a private note, not in GitHub issues: what happened, when it was
noticed, what data and roughly how many people, what was done to contain
it, and who knows. Keep it, even if it turns out to be nothing: the ICO
expects a record of every breach, reported or not.

## 3. Decide whether to tell the ICO (within 72 hours)

Report to the ICO **within 72 hours of noticing** unless the breach is
unlikely to put anyone at risk. Because committee members' details can
reveal their religion, assume a leak of logins, emails or roles **is**
reportable. A lost backup that was encrypted, or a mistake caught before
anyone saw it, usually isn't.

- ico.org.uk → "Report a breach", or call 0303 123 1113.
- It's fine to report before you know everything; add details later.

## 4. Tell the people affected (if the risk is high)

If someone could be harmed (for example, their involvement with a mandir
became public), tell them directly and plainly: what happened, what data,
what we've done, and what they can do. Committee members' login emails
are in Supabase Auth.

## 5. Afterwards

Within two weeks: what let it happen, what's changed so it can't again,
and whether the DPIA, retention schedule or privacy notice need
updating. Review this plan yearly with the DPIA.
