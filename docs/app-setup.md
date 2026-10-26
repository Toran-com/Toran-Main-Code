# App setup: from empty repo to a live "coming soon" page

The plan for step 3 of the build (an empty app that goes all the way to a
live site). It follows decisions 0002 and 0003; if 0003 changes, this
changes with it.

Status (12 Oct 2026): pull request 1 merged and live on Vercel. Pull
requests 2 to 11 are open, each built on the one before; merge them in
order.

## Your to-do list, in order

Everything Claude can't do for you. Each step says where it's explained
below.

1. **Merge the pull requests in order**, #2 first. Wait for each to show
   green ticks after the previous one is merged.
2. **Vercel → Settings → Environment Variables** (pull request 3): add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   from Supabase → Project Settings → API, for Production and Preview.
   Redeploy.
3. **GitHub → Settings → Secrets → Actions** (pull request 3):
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`,
   `SUPABASE_STAGING_DB_PASSWORD`. Then merged migrations reach the
   database automatically.
4. **Supabase → Authentication** (pull request 4): set the site URL and
   redirect URLs, turn on TOTP, and add yourself as a Toran admin with the
   SQL given there. Set up the email provider (SMTP) before the pilot.
5. **Sentry** (pull request 5): sign up, then add `NEXT_PUBLIC_SENTRY_DSN`
   in Vercel.
6. **Watch** the GitHub repo so uptime and Dependabot emails reach you.
7. **Skim the mandir list** (pull request 7) and try the pages on your
   phone (pull requests 8 and 9).
8. **Read the legal drafts** (pull request 11) before showing Toran to
   anyone outside the pilot committees.

---

## Before we start (you, about 30 minutes)

1. **GitHub organisation.** On github.com: your profile picture → Your
   organizations → New organization → Free plan. Name it after the company
   (for example `Toran-com`). Add your partner as an owner.
2. **New repo** in that organisation: name `Toran-Main-Code`, private, with a README.
   Do not add a .gitignore or licence; the setup creates them.
3. **Give Claude access.** Go to https://claude.ai/connect-github and install
   the Claude GitHub App on the new organisation (choose "only selected
   repositories" → `Toran-Main-Code`).
4. **Accounts, all signed up with a company email, not personal ones:**
   - Supabase (database and login): create `toran-staging` now, region
     London; create `toran-prod` nearer launch (free projects pause after a
     week without use)
   - Vercel (hosting): connect it to the GitHub organisation, but import
     the project only after pull request 1 is merged. The free Hobby plan is
     for non-commercial use; move to a Pro team (about $20 a month) before
     the pilot launch
   - Sentry (error alerts): free plan
5. Tell Claude: "the repo is Toran-com/Toran-Main-Code". Claude attaches it to this
   session and does the rest.

Never paste passwords or secret keys into the chat. Supabase and Vercel
keys go straight into Vercel's settings; Claude will say exactly which ones.

---

## What Claude builds (about a week of evenings, in pull requests)

### Pull request 1 — the skeleton

```
Toran-Main-Code/
├── app/                    Next.js app (App Router, TypeScript)
│   ├── (public)/           public site: what's on, festivals, digest signup
│   ├── (mandir)/           mandir admin area, behind login
│   ├── (ops)/              Toran admin area, behind login + second factor
│   ├── api/                webhooks (email, WhatsApp later)
│   └── page.tsx            "Toran — coming soon"
├── lib/                    shared code: database client, dates, festivals
├── supabase/
│   ├── migrations/         every database change, numbered, in order
│   └── seed.sql            mandir list and festival dates for a fresh database
├── jobs/                   scheduled work: crawler, digest, reminders
├── tests/                  unit tests (Vitest) and browser tests (Playwright)
├── docs/                   moved from the research repo, decisions included
├── .github/workflows/      automatic checks
├── .env.example            names of every setting, no values
└── README.md               how to run it locally in five commands
```

Tools fixed in this pull request:

| Job             | Tool                                                       |
| --------------- | ---------------------------------------------------------- |
| Language        | TypeScript, strict mode                                    |
| Framework       | Next.js                                                    |
| Styling         | Tailwind CSS, with the colours and type from the prototype |
| Code style      | ESLint and Prettier, run automatically                     |
| Unit tests      | Vitest                                                     |
| Browser tests   | Playwright                                                 |
| Database        | Supabase (Postgres), migrations via the Supabase CLI       |
| Package manager | pnpm                                                       |
| Node version    | pinned in `.nvmrc`                                         |

### Pull request 2 — automatic checks

A GitHub Actions workflow (`.github/workflows/checks.yml`, check name
**Checks**) runs on every pull request and every change to `main`: install,
formatting, lint, type check, unit tests, build, and the browser tests on a
phone-sized screen. It takes about three minutes. If the browser tests fail,
their report is kept for a week under the run's Artifacts.

**Making a failing check block the merge.** GitHub only enforces this on a
private repo with a paid plan (GitHub Team, per user per month; check
github.com/pricing). On the free plan the red cross still shows on the pull
request, so the rule until then is: never merge a pull request that isn't
green. To turn enforcement on once the organisation is on Team:

1. Repo → Settings → Rules → Rulesets → New ruleset → New branch ruleset.
2. Name `Protect main`, Enforcement status **Active**, Target branches
   **Include default branch**.
3. Tick **Restrict deletions**, **Require a pull request before merging**,
   **Require status checks to pass** (add **Checks** and **Vercel**), and
   **Block force pushes**. Save.

Free-plan limits that matter: 2,000 GitHub Actions minutes a month for
private repos, which is roughly 600 runs of this workflow.

### Pull request 3 — the database and three copies of the site

| Copy    | Where                          | Database                                    | When it updates              |
| ------- | ------------------------------ | ------------------------------------------- | ---------------------------- |
| Local   | Your laptop                    | Local Supabase in Docker                    | When you run it              |
| Preview | A Vercel link per pull request | `toran-staging`                             | Every push to a pull request |
| Live    | toran-main-code.vercel.app     | `toran-staging` now, `toran-prod` at launch | Every merge to main          |

What it adds: the `supabase/` folder with the first migration (a `health()`
function), the Supabase client, `/api/health` (200 when the database
answers, 503 when it doesn't or isn't connected), and the **Database**
workflow. Migrations are checked on a fresh database in every pull request
and applied to `toran-staging` on merge (decision 0009).

**Your part, once (about 15 minutes):**

1. **Vercel → project → Settings → Environment Variables.** Add, for both
   **Production** and **Preview**, from Supabase → `toran-staging` →
   Project Settings → API Keys / Data API:
   - `NEXT_PUBLIC_SUPABASE_URL`: the Project URL, `https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable key
     (`sb_publishable_…`; older projects call it the anon key)

   Then Deployments → latest → Redeploy, so the site picks them up.

2. **GitHub → repo → Settings → Secrets and variables → Actions → New
   repository secret.** Add three:
   - `SUPABASE_ACCESS_TOKEN`: Supabase → your avatar → Account → Access
     Tokens → Generate new token (name it `github-toran`)
   - `SUPABASE_STAGING_PROJECT_REF`: the `<ref>` part of the Project URL
   - `SUPABASE_STAGING_DB_PASSWORD`: the database password you saved when
     creating the project
3. Check: after the next merge, the **Database** workflow's "Apply
   migrations" step goes green, and `/api/health` on the live site shows
   `"database":"ok"`.

At launch, create `toran-prod`, add `SUPABASE_PRODUCTION_PROJECT_REF` and
`SUPABASE_PRODUCTION_DB_PASSWORD`, run the Database workflow by hand with
target `production`, and point Vercel's **Production** variables at it.

### Pull request 4 — login and roles

What it adds: login by emailed link (`/login`), the link handler
(`/auth/confirm`), `/account`, log out, and the Toran admin area (`/ops`),
which also needs an authenticator app (decision 0010). Database:
`toran_admins` and `is_toran_admin()`, with pgTAP tests. GitHub runs the
whole login flow, including the authenticator step, against a real local
Supabase on every pull request (the **Login flow** job).

The rule that a mandir admin can only change their own mandir arrives with
the mandirs table in pull request 6.

**Your part, once (about 10 minutes), in Supabase → `toran-staging`:**

1. **Authentication → URL Configuration.**
   - Site URL: `https://toran-main-code.vercel.app`
   - Redirect URLs, add three: `https://toran-main-code.vercel.app/**`,
     `https://*-toran4.vercel.app/**` (preview links) and
     `http://localhost:3000/**`
   - On the live project (`toran-prod`), add only the live address. The
     preview pattern matches any Vercel address ending in `-toran4`, and
     anyone can make one of those, so a login link could be sent to their
     site (docs/security-review.md, finding 2).
2. **Authentication → Multi-Factor** (or Sign In / Providers → MFA): make
   sure **TOTP (authenticator app)** is enabled.
3. Log in once at `/login` with your email, then make yourself an admin in
   **SQL Editor**:

   ```sql
   insert into public.toran_admins (user_id, note)
   select id, 'Milan' from auth.users where email = 'you@example.com';
   ```

   Then open `/ops` and set up your authenticator app.

4. Before the pilot: **Authentication → Emails → SMTP Settings**, connect a
   proper email sender (Resend or Postmark). The built-in sender only sends
   a few emails an hour and isn't meant for real use.
5. **Authentication → Sign In / Providers → Email**: make sure **Confirm
   email** is on (it is unless someone turned it off). With it off, anyone
   can make an account for someone else's address (docs/security-review.md,
   finding 1).
6. Before the pilot: **Authentication → Rate Limits**, once the email sender
   is connected, raise emails sent per hour to about 30. The limit is for
   the whole site, so at a few an hour anyone could use it up and stop
   committee members logging in. Also consider **Attack Protection →
   CAPTCHA** (Cloudflare Turnstile, free) on the login page, which needs a
   small change to the page itself.

### Pull request 5 — error alerts and uptime

What it adds: Sentry error reporting (inactive until its key is set; never
sends personal data: no cookies, headers, IP or user details, and email
addresses are scrubbed from messages), a friendly error page and a branded
"page not found", `/api/debug/error` (a deliberate error for testing Sentry
on preview links and your computer; 404 on the live site), and the hourly
**Uptime** workflow.

**Uptime:** checks `https://toran-main-code.vercel.app/api/health` every
hour. If it fails, it opens a GitHub issue labelled "site down" (GitHub
emails you) and closes it when the site recovers. "Database not configured"
isn't treated as an outage. It starts once this is merged to `main`. When
the real domain exists, set it in GitHub → Settings → Secrets and variables
→ Actions → **Variables** → `SITE_URL`. Make sure you **Watch** the repo
(top right on GitHub) so issue emails reach you.

**Sentry, your part (about 10 minutes, any time):**

1. Sign up at sentry.io (free plan), create a project, platform **Next.js**,
   name `toran`. Choose the EU data region if offered.
2. Copy the **DSN** (Settings → Projects → toran → Client Keys).
3. Vercel → Settings → Environment Variables: add
   `NEXT_PUBLIC_SENTRY_DSN` for Production and Preview, then redeploy.
4. Sentry → Settings → Security & Privacy: turn on **Prevent Storing of IP
   Addresses**; keep **Data Scrubber** on.
5. Test: open `/api/debug/error` on a preview link; the error should appear
   in Sentry within a minute.

### Pull request 6 — the data model

What it adds: the database tables for mandirs, their committees and
claims, festivals and their dates, events, sources, and seva rotas, with
security rules on every table. See `docs/data-model.md`. Nothing for you
to do.

### Pull request 7 — the mandir list and festival dates

What it adds: the 106 mandirs from your outreach and audit lists (no
duplicates, no emails or phone numbers), and the main festival dates for
2026-27, each marked _not yet checked_ with where it came from.

**Your part (when you have 20 minutes):** skim `supabase/data/mandirs.csv`
for anything wrong (a name, a town, a website). Tell Claude and it will fix
the list. Later, the festival dates get checked against a London panchang
(a Toran admin ticks them off).

### Pull request 8 — the first public pages

What it adds: `/mandirs` (every mandir by region and town, with a search
box), a page for each mandir (details, directions, upcoming events, or a
friendly "no events yet"), and `/festivals` (upcoming dates by month,
marked "Date not yet checked" until checked). The home page links to both.

Until launch, every page asks search engines not to list it
(`launched: false` in `lib/site.ts`). Pages are built ahead of time from
the database and refreshed hourly, so they stay fast and cheap.

**Your part:** once #3's database settings are in Vercel, open
`/mandirs` on the preview link and click around on your phone.

### Pull request 9 — mandir committees look after their page

What it adds:

1. **Claim:** on any mandir's page, "Look after this page" → log in → say
   your role at the mandir → send.
2. **Approve:** claims appear on `/ops` (Toran admins, after the
   authenticator code) with the person's email, their role, and the
   mandir's public phone and website. **Check with the mandir first**,
   usually by phoning them, then press Approve. Let the person know by
   email yourself for now.
3. **Manage:** approved committee members find their mandir under "Your
   mandirs" on `/account`. Adding an event takes three fields (what, date,
   start time). Each event has "Still on", "Cancel" and "Remove" buttons.
   Changes show on the public page straight away.

Events can repeat: every week, every other week, or once a month (for
example the second Saturday, or the last Friday). Each repeating event
shows once on the public page with its next date. Repeats run for six
months by default, or up to a year.

Committees can also correct their mandir's postcode, website and phone
number on the same page; the name and town stay with you. Removing an event
asks "Are you sure?" first.

Removed events are only hidden: they stay in the database, in case one is
removed by mistake (ask Claude to restore it).

### Pull request 10 — housekeeping

What it adds: Dependabot, which opens a pull request each week when
packages have updates (grouped, so usually one) and each month for GitHub
Actions. Merge them when their checks are green; anything bigger (a new
major version) gets a separate pull request and is worth asking Claude
about. Also a refreshed README listing every page built so far.

### Map positions (after the mandir details are merged)

Once, on `/ops` (after your authenticator code), press **Fill in map
positions**. It looks up each mandir's postcode on postcodes.io and saves
the map position, which "near you" and distances need. It only fills
mandirs without a position, so it's safe to press again after adding
mandirs.

Postcode positions come from the ONS Postcode Directory. Pages that show
distances must say: "Contains OS data © Crown copyright and database right;
contains Royal Mail data © Royal Mail copyright and database right; source:
Office for National Statistics, licensed under the Open Government Licence
v3.0." The "near you" pages will include this.

### Admin tools (`/ops`)

After your authenticator code, `/ops` has three tabs:

- **Overview**: committee requests to approve, and map positions.
- **Mandirs**: search every mandir, including hidden ones. Open one to:
  - correct its details (changing the postcode updates the map position);
  - hide it from the public site the same day a mandir asks;
  - see who looks after its page and remove someone's access. When nobody
    is left, the page can be claimed again.

  **Add a mandir** creates a new public listing straight away.

- **Festival dates**: once you've checked a date against a London panchang,
  mark it checked and say where you checked it. Its "Date not yet checked"
  label disappears from the public site.

### What's on and festival pages

- **`/whats-on`** lists every event at every mandir for the next eight
  weeks, grouped by day. Someone can type a postcode or just the first half
  (for example "HA9") and pick a distance; the list then shows only events at
  mandirs that close, still by day, each with its distance. The postcode is looked up
  on postcodes.io and is **not saved in Toran's database**. It is part of
  the page address (so a search can be shared), which means it appears in
  Vercel's request logs for as long as those are kept, and the looked-up
  position is cached on the server for a few days. Worth a line in the
  DPIA. Mandirs without a map position are left out of a "near you" search,
  so press **Fill in map positions** on `/ops` first.
- **`/festivals/<name>`**, for example `/festivals/diwali`, shows the
  festival's UK dates and the events during those dates whose title or
  description mentions it (for example "Garba" counts for Navratri). The
  festivals list links to each one.
- **Festival season pages**: `/diwali`, `/navratri`, `/maha-shivaratri`,
  `/holi`, `/ram-navami`, `/janmashtami` and `/ganesh-chaturthi` gather a
  season's festival days (Diwali week, or Holika Dahan and Holi) and every
  mandir's events across them, with Near me and a calendar to subscribe
  to. The home page points to whichever season is within six weeks. The
  seasons and their words are in `lib/seasons.ts`; a new one also needs its
  folder under `app/(public)/(directory)/` and adding to `count_visit`.

A repeating event shows once, at its next date, labelled "Every Saturday".
New and changed events show on these pages straight away.

### Sharing on WhatsApp

Every event, mandir page and festival page has **Share: WhatsApp · Copy
link** (on a phone, "Other apps" opens the phone's own share menu). WhatsApp
opens with the message ready, for example "Diwali celebrations at Reading
Hindu Temple, Reading: Sun 8 Nov, 6:30pm" and the link, which goes
straight to that event on the mandir's page.

Shared links show a preview card with the toran garland and the mandir or
festival name. To see one before launch, paste a preview link into a
WhatsApp chat with yourself. WhatsApp keeps a card for a while once it has
fetched it, so a change may take a day to show on a link already shared.

### Review queue (`/ops` → Review)

Everything waiting before it goes on the site is in one queue, oldest
first: posters you type up, events visitors send in with "Tell us about an
event", and events the website checker finds. Filter it by where each came
from; each says how long it has waited.

When someone forwards a poster or message about a mandir's event (WhatsApp,
email, a photo of a printed poster):

1. On **Review**, choose the mandir under "Type up a poster", copy the event
   details in and say where it came from. **Only the event**: never the name
   or phone number of whoever sent it. The poster image itself isn't kept.
2. **If the mandir has a committee**, it waits on their manage page under
   "Posters waiting for you". Publishing it there marks it "Confirmed by the
   mandir". You can still correct the details for them ("Fix something
   first" → "Save for the committee"), or discard it.
3. **If nobody looks after the mandir yet**, you publish it yourself. It
   appears without the "Confirmed by the mandir" label.

**Look-alikes.** When an item looks like an event already on the mandir's
page, or another item waiting, on the same day (nearly the same name, or
the same festival however it's spelled), it says "This may already be on
Toran" and names it. Discard the copy.

**Fixing before publishing.** "Fix something first" opens that item's
details to correct; "Save and publish" publishes your corrected version
(committees have the same on their page). What was published is kept with
the item.

The database records who published or discarded each item and when, and a
decision can't be changed afterwards.

### Seva rota (committees)

On their manage page, each event has **Seva rota**. The committee adds
roles (Kitchen, Parking, Shoes; tick "Needs a DBS check" where it applies)
and shifts with how many people each needs. **Send the rota** turns it into
a WhatsApp message for the volunteers' own group, where people reply as
they do now.

The committee can count people in (**+ / −**) and turn on **Let volunteers
take slots on Toran**: the rota's public page then has "Take this slot",
with no sign-up and no name (decision 0013). Toran keeps **no volunteer
names or numbers**, only how many places are taken. Named sign-up waits for
ICO registration and the DPIA (decision 0006).

### What needs doing (committees)

The top of each mandir's committee page (`/manage/<mandir>`) says what to
do next, worked out from the page itself (`lib/committee-tasks.ts`):

- posters or messages waiting to be checked;
- events in the next 30 days nobody has confirmed for 30 days ("Still on");
- seva shifts in the next fortnight with places still free (not those
  needing a DBS check);
- a festival in the next 21 days with nothing added for it;
- nothing coming up at all.

New committees also see **Getting started**: check the mandir's details,
add a first event, invite a colleague. Each step ticks itself off. The
account page shows each mandir with how many things need doing and a link
to the first.

### Reading mandirs' websites (`/ops` → Websites)

**Check** reads one mandir's website; **Check the next 5 websites** works
through them, oldest check first. Each check reads the home page, up to
five pages that look like an events list, and the event data they lead to:

- event data in the pages (schema.org JSON-LD or microdata, or the older
  hCalendar and h-event markup), including on single event pages when the
  list itself has none;
- calendar feeds (`.ics`, "Export events", `webcal:` links);
- Google Calendars shown on the site (their public feed);
- WordPress sites with The Events Calendar (its list of events).

Names and descriptions are cleaned into plain text (HTML, codes like `\n`,
page-builder shortcodes and "Read more" removed; names in capitals put in
title case). When a site gives midnight or no time, the first time written
in the description is used. Each event gets a likely type (festival,
aarti, bhajans…) from its name. New events go to the poster queue, for a
person to check before they're published.

Under each mandir, notes say what was read and, if nothing was found, why:
for example a Wix site (events load in the browser) or a site that only
writes dates out in text or poster pictures. For those, ask the committee
to add events themselves or forward their posters. It obeys robots.txt and
never reads Facebook or Instagram (decision 0005).

It also lists up to five patrikas and posters each site links to or shows:
PDFs and pictures whose words or file names look like a programme, poster
or festival (not logos or small pictures). Toran doesn't download or read
them; each has **Type it up**, which opens the poster form on
`/ops/posters` with the mandir, the patrika's address and "Mandir's
website" already filled in.

### Nightly job (decision 0016)

Every night at about 02:15 UTC, Vercel runs `/api/cron/nightly`. It
deletes what the retention policy says to delete (expired invites, old
committee requests, visit totals over three years old), then checks up to
12 mandir websites, oldest check first, like **Check the next 5 websites**.
`/ops` → Needs attention shows when it last ran and what it did, and warns
if it hasn't run for a day and a half.

It needs two settings in **Vercel → Project → Settings → Environment
Variables**, for **Production** only. Type them there yourself; never
paste them into the chat:

1. `CRON_SECRET`: a long random password (at least 32 characters, for
   example from your password manager). Vercel sends it with each run, so
   nobody else can start the job.
2. `SUPABASE_SECRET_KEY`: in **Supabase → Project Settings → API Keys →
   Secret keys**, create a key called `vercel-nightly` and copy it in. It
   passes every database rule, so keep it only here. If it ever leaks,
   delete it in Supabase and create a new one.

Then redeploy. **Vercel → Project → Settings → Cron Jobs** lists the job,
with a **Run** button to try it straight away; afterwards Needs attention
shows "Nightly job last ran …".

### Reading posters (`/ops` → Review queue → Read a poster)

Toran's admins can send a poster's photo or PDF to Claude, which reads the
events off it into the review queue for checking (decision 0018). It's off
until it has a key:

1. In **console.anthropic.com → Settings → API Keys**, create a key called
   `toran-posters`. Setting a monthly spend limit there is a good idea.
2. Add it in **Vercel → Project → Settings → Environment Variables** as
   `ANTHROPIC_API_KEY`, for **Production** only. Type it there yourself;
   never paste it into the chat.
3. Redeploy. The "Read a poster" card in the review queue then shows the
   form instead of "Not switched on yet".

### Weekly digest preview (`/ops` → Digest)

Shows what the weekly email would say: every event in the next seven days,
by day, and festivals in the next fortnight, for the whole UK or one region.
There's a plain-text version to copy.

**Nobody receives it yet.** There's no sign-up form or subscriber list until
Toran is registered with the ICO and the DPIA is done (decision 0006).
Sending it for real is a later step.

### Translations (`/ops` → Translations)

Public text comes from `lib/i18n/en.ts` (English) through a small
translation layer (`lib/i18n/index.ts`), so other languages can follow.
**Gujarati** (`lib/i18n/gu.ts`) is a first draft, not yet checked.

Every page families use has a Gujarati version at the same address with
`/gu` in front: `/gu` (home), `/gu/whats-on`, `/gu/mandirs` and each
mandir, event, seva rota and "Tell us" page, `/gu/festivals`, and each
festival season page (`/gu/holi`, `/gu/diwali` and so on). Dates
are in Gujarati ("શનિ 24 ઑક્ટો, સાંજે 6"), as are "Every Saturday", kinds
of event, the map and the share buttons. Festival names and descriptions
are translated too (`festival.name.*` in the translations), and so are
the season pages' words (`season.*`; the English there must match
`lib/seasons.ts`, which a test checks). Mandir names,
and events' own titles and descriptions, stay as the committee wrote them;
a Gujarati title shows under the English when the committee gives one.
Committee and admin pages, "For mandirs" and the guide stay in English.
Visits to a Gujarati page count towards its English page in Stats.

**While it's a draft** (`ready: false` in `lib/i18n/index.ts`), the
Gujarati pages say so at the top, aren't linked from the English pages,
and ask search engines to leave them out. Send a reviewer straight to a
page, for example `/gu/mandirs/<a mandir>`, to read it in place.

**To switch Gujarati on:**

1. A native Gujarati speaker checks every line. On Translations, **Copy the
   list** gives numbered English and Gujarati pairs to send them; they reply
   with numbers and corrections, which go into `lib/i18n/gu.ts` (and
   `lib/i18n/client-messages.ts` for the lines the browser shows).
2. Set `ready: true` for `gu` in `lib/i18n/index.ts`. The draft notice goes,
   a "ગુજરાતી" / "English" switch appears in the header, and the Gujarati
   pages join the sitemap.
3. Optional: add a Gujarati font (Noto Sans Gujarati) and check the speed
   budget. Phones' own Gujarati fonts are used until then.

### Pages about Toran (footer)

Every public page's footer links to **About**, **Contact**, **Correct or
remove something**, **Privacy**, **Terms** and **Accessibility**. Login,
committee and admin pages link to Privacy, Terms and Contact.

- `/privacy` and `/terms` show `docs/legal/privacy-notice.md` and
  `docs/legal/terms.md` as they are, so edit those files to change the
  pages. While `legalChecked` in `lib/site.ts` is `false`, both say they
  are drafts and highlight every [bracket] still to fill in.
- `/corrections` lets anyone ask for a mistake to be fixed, a mandir's page
  to be hidden or personal details to be taken down, without giving their
  name. Mandir and event pages link to it with the page filled in.
  Requests appear under **Corrections and removals** on `/ops/attention`;
  press **Done** once each is dealt with. The terms promise mandirs that
  ask to be hidden it happens the same day.
- **Spam on the public forms** ("Tell us about an event" and
  `/corrections`) is held back without keeping anything about senders
  (`lib/spam.ts`):
  - a hidden field only robots fill in: they're thanked and nothing is
    saved;
  - link markup (`<a href`, `[url=`) and plain spam words are dropped the
    same way; more than two web addresses asks the person to remove some;
  - five sends of a form in ten minutes from one internet address, then a
    short wait. This is counted in the server's memory only, under a
    scrambled code, and never saved; with several servers running it is a
    speed bump rather than a wall;
  - in the database: at most 30 sends an hour of each form across the
    whole site, at most 10 reports waiting per mandir, 300 reports and 200
    corrections waiting in all, and the same event or correction twice is
    kept once.

  If robots still get through, add a rate-limit rule in Vercel's
  Firewall for POST requests to `/corrections` and `/mandirs/*/tell-us`.

- `/contact` points people to the right form. Once Toran has its own email
  address, put it in `CONTACT_EMAIL` in `lib/site.ts` and the page shows
  it for privacy requests.

### Ready for Google (switched off until launch)

Until launch every page says "don't list me", `/sitemap.xml` is empty and
`/robots.txt` offers no sitemap. Admin pages (`/ops`, `/manage`, `/account`)
are always off-limits to search engines. Each event on a mandir's page
already carries the schema.org description Google uses for event listings.

**At launch** (a decision for you and your partner, not before):

1. In `lib/site.ts`, change `launched: false` to `launched: true` and merge.
2. In [Google Search Console](https://search.google.com/search-console),
   add the site, then submit `https://<your domain>/sitemap.xml`.
3. Paste a mandir page with events into Google's
   [Rich Results Test](https://search.google.com/test/rich-results) to check
   its events are read.

### Done when

- The "coming soon" page is live on a real URL
- A change made in a pull request shows on its own preview link
- A failing test blocks the merge
- You can log in by email link on the live site
- A deliberate test error shows up in Sentry
- The README gets a new person running it locally in under 15 minutes

---

## After this

Next in the build (docs/architecture.md): what's on near you (events
across mandirs by date and distance), the weekly digest, forwarding
posters by WhatsApp or email into the review queue, and the seva rota.
The digest and rota sign-ups hold the public's personal data, so they
wait for ICO registration and the DPIA (decision 0006; drafts in
`docs/legal/`).
