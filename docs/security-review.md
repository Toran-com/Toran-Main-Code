# Security and privacy review before the pilot

Date: 2026-10-21. Covers everything on `main` at that date: the database
rules (all 29 migrations), the server code, the admin area and its second
factor, the public forms, the nightly job, and what we keep against the
privacy notice, the retention schedule and decision 0006.

**In short:** the foundations are sound. Every table has row-level
security, admin powers need the second factor in the database itself, and
the public forms keep nothing about the sender. The review found one
serious gap (finding 1), fixed in this pull request, and two settings for
Milan to change in the Supabase dashboard (findings 1 and 2).

## What needs Milan (dashboard settings, about 10 minutes)

Do these in Supabase for whichever project the pilot runs on (today that
is `toran-staging`, at toran-main-code.vercel.app). The steps are also in
docs/app-setup.md.

1. **Authentication → Sign In / Providers → Email: Confirm email** must be
   on. Check it; it's on unless someone turned it off.
2. **Authentication → URL Configuration → Redirect URLs:** remove
   `https://*-toran4.vercel.app/**` from the project the pilot runs on.
   Keep it only on a project used for testing.
3. **Authentication → Rate Limits:** once the proper email sender is
   connected, raise emails per hour to about 30.
4. **Optional, Vercel → Firewall:** if your plan includes it, add a
   rate-limit rule for form posts (for example, 10 a minute per visitor
   to `/corrections`, `/mandirs/*/tell-us` and seva pages).

## Findings

| #   | What                                                                | How serious                       | Status                                            |
| --- | ------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------- |
| 1   | Someone could accept a committee invite meant for someone else      | High if "Confirm email" is off    | Fixed here; check the setting                     |
| 2   | Login links could be sent on to someone else's Vercel site          | Medium                            | Milan: remove the preview pattern                 |
| 3   | The website checker could be pointed at internal addresses          | Medium (low on Vercel)            | Fixed here                                        |
| 4   | Some admin buttons relied on the database alone to refuse outsiders | Low                               | Fixed here                                        |
| 5   | A correction request could carry a link to another site             | Low                               | Fixed here                                        |
| 6   | No browser security headers (another site could frame Toran)        | Low                               | Fixed here                                        |
| 7   | Addresses typed on the login page were kept for good if never used  | Privacy                           | Fixed here; privacy notice and schedule updated   |
| 8   | A flood of form posts could fill the queues for real requests       | Low                               | Accepted for the pilot; see the Vercel rule       |
| 9   | Login emails share one hourly limit for the whole site              | Low                               | Milan: raise the limit; CAPTCHA later             |
| 10  | Logins unused for 24 months aren't deleted automatically yet        | Privacy (a promise in the notice) | By hand until a job exists; before the pilot ends |

### 1. Accepting an invite meant for someone else

Invites are accepted by email address, and the database took the address
from the login token. If **Confirm email** is off in Supabase, anyone can
sign up through Supabase's public API with a colleague's address and a
password, get a session at once, and accept that colleague's invite:
they would then run the mandir's page. Supabase even marks such an
address "confirmed" when confirmation is off.

**Fixed** (`20261022090000_security_review.sql`): the address now comes
from the account, only once confirmed, and never from a session that
logged in with a password (Toran only logs people in by emailed link). The
same check now applies to asking to look after a page, so Toran's admins
never see an address nobody has proved. New database tests cover both. The
dashboard setting is still worth checking, as the first line of defence.

### 2. Login links sent on to another site

The redirect list allows `https://*-toran4.vercel.app/**` for preview
links. Vercel addresses end in the owner's account name, and anyone can
choose an account name ending in `-toran4`. With such a site, someone could
ask Supabase to email a real Toran login link to a committee member that
lands on their site and hands them the login. **For Milan:** remove the
pattern from the project the pilot runs on (test previews against a
separate project, or add each preview address by hand).

### 3. The website checker and internal addresses

The checker refuses private and local addresses, but missed the IPv6 way
of writing an IPv4 address: a website typed as `http://[::ffff:127.0.0.1]/`
was fetched. Committee members can change their mandir's website, so this
could make Toran's server fetch addresses inside its own network.
**Fixed:** the check now uses Node's own address lists and covers the
mapped, embedded and reserved forms. Tests show the old check let four such
addresses through and the new one lets none.

What's left: the checker looks the address up, then fetches; a site that
changes its address between the two could still slip through. On Vercel
there's little to reach, so this is noted rather than fixed.

### 4. Admin buttons

Every admin page checks for a Toran admin with the second factor, and so
does the database. But a few of the buttons behind those pages (approve a
claim, fill in map positions, mark a festival date checked, edit a mandir,
add or publish a poster) didn't check themselves. The database still
refused any change, so nothing could be altered, but anyone could make the
server look up postcodes for every mandir. **Fixed:** each now checks
first, like the website buttons already did.

### 5. Links in correction requests

The correction form keeps the page a request is about. `//example.org` was
already refused, but `/\example.org` (which browsers treat the same) wasn't,
in the form or in the database. **Fixed** in both, with tests.

### 6. Browser security headers

Every page now says: only Toran may show it in a frame (so no other site
can trick a committee member into pressing a hidden button), don't guess
file types, tell other sites only "toran" when following a link, and no
camera or microphone (location stays allowed, for "Near me"). A full
content security policy would need a new code on every page, which would
stop pages being prepared ahead, so it isn't included. React escapes what
people type, and the search-engine data is escaped and tested.

### 7. Login addresses never used

Typing an address on the login page creates an account for it straight
away. If the link is never opened (a typo, or someone typing other people's
addresses), that address was kept for good, against decision 0006.
**Fixed:** the nightly job now deletes accounts whose link was never used
after 7 days, never touching anyone who runs a mandir or Toran. The
retention schedule and privacy notice now say so.

### 8. Floods on the public forms

"Tell us about an event" allows 10 waiting reports per mandir and 300 in
all; corrections allow 200 open at once. That stops the queues growing
without limit, but someone determined could fill them, and genuine
requests (including "please remove my details") would be turned away with
"try again tomorrow". Seva slots can be taken in bulk too, though the
committee can clear them. Nothing about senders is kept, so the database
can't limit per person. **Accepted for the pilot.** If abuse appears, add
the Vercel rule above. Once `CONTACT_EMAIL` is set (lib/site.ts), the "busy"
message should offer it as another way to ask.

### 9. Login email limit

Supabase's limit on login emails is for the whole site. At the built-in
sender's few an hour, anyone could use it up. **For Milan:** raise it once
the proper sender is connected. A CAPTCHA (Cloudflare Turnstile) can follow
if needed; it needs a small change to the login page.

### 10. Logins unused for 24 months

The privacy notice promises to delete logins 24 months after the last one,
emailing first. Nothing does this yet; the schedule says "by hand at
first". No login will be that old until 2028, so this is a note for the
plan, not a gap today.

## Checked and fine

- **Row-level security** is on for all 18 tables, and each starts by taking
  back Supabase's default access and granting only what's needed.
- **Functions that run with extra rights** (`security definer`) all fix
  their search path and check who's calling. Visitors can only call six:
  the health check, counting a page view, taking and giving back a seva
  slot, telling us about an event, and asking for a correction. Each checks
  what it's given and keeps no sender details.
- **Admin powers** need the second factor in the database
  (`is_toran_admin()` checks `aal2`), not just in the pages. Supabase won't
  add another authenticator to an account that has one without the second
  factor, so a stolen login link alone can't unlock the admin area.
- **Committee members** can change their own mandir's details and events,
  but not its name, area or status, and not another mandir's.
- **The secret key** is only used by the nightly job, which checks its
  secret in constant time and answers "not found" to everyone else.
- **After login**, people are only ever sent to a page on Toran (no open
  redirect), and website and event links must start with http or https.
- **Public pages** show no personal details: mandir phone numbers come
  only from the mandir's own website, and committee members' addresses are
  shown only to their own committee and Toran's admins.
- **Retention** matches the schedule for invites, page requests, visit
  totals, the job log and correction requests. Requests to look after a
  page that are still waiting stay until a Toran admin decides; they're
  listed on /ops/attention, so they don't get forgotten.
