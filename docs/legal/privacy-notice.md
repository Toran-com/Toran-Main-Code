# Privacy notice (DRAFT)

> Draft for review, [date]. Not yet published. Text in [brackets] needs
> filling in or checking.

Toran is run by **[Company name] Ltd**, a company registered in England and
Wales (number [number]), registered office [address]. We are the
"controller" of the personal data described here. ICO registration number:
[number].

Questions or requests about your data: **[privacy@domain]**. We reply
within one month.

## The short version

- You can browse Toran without an account. We don't use tracking cookies
  or advertising, and we don't sell or share data for marketing.
- Mandir committee members who look after a mandir's page log in with
  their email address. That's most of what we hold.
- Knowing which mandir someone is involved with can reveal their religion.
  We treat that with extra care and collect as little as we can.

## If you just visit the site

- **No account and no tracking cookies.** We don't record who you are or
  which mandirs you look at.
- **Server logs.** Our hosting provider (Vercel) briefly keeps technical
  logs, including IP addresses, to run the site and protect it from abuse.
  [Check Vercel's log retention for our plan.]
- **Error reports.** If a page breaks, an error report goes to Sentry so
  we can fix it. We set it up not to store IP addresses, cookies, browser
  headers or email addresses.
- **The mandirs map.** The map pictures come from OpenStreetMap. Your
  browser fetches them directly, so OpenStreetMap sees your IP address, as
  any website you visit does. If you press "Near me", your browser asks
  first; your location only moves the map on your screen and is never sent
  to us or kept.
- **"Near me" on What's on and the festival pages.** If you press it, your browser asks first,
  then sends your position (rounded to about a kilometre) to postcodes.io
  to find your postcode district, such as "RG1". Only the district reaches
  Toran, just as if you'd typed it; your position isn't sent to us or
  kept. postcodes.io is a free public service run by Ideal Postcodes.
  Your phone remembers the postcode or district you chose (or that you
  chose all of the UK), so What's on starts there next time. It stays on
  your phone; clearing the site's data in your browser forgets it.
- **Calendars.** If you add a mandir's events or the festival dates to
  your calendar, your calendar app checks Toran for changes every few
  hours. Like any visit, that shows up briefly in the server logs; we
  don't know who subscribes and need no account.
- **Offline copies.** Your phone keeps copies of the public pages you've
  opened (What's on, mandir and festival pages), so they still open
  without signal. They stay on your phone; clearing the site's data in
  your browser removes them. Nothing personal is kept.
- **Seva slots.** If a mandir lets you take a seva slot on Toran, we
  keep only that one more slot is taken, with the time. We don't ask for
  or keep your name, contact details or anything about your phone. Your
  phone remembers which slots you took, so you can see them, add them to
  your calendar or give them back; clearing the site's data in your
  browser forgets them.
- **Following a mandir.** If you press "Follow" on a mandir's page, your
  phone remembers that mandir; nothing is sent to us and you need no
  account. When you choose "Only mandirs I follow" on What's on, the
  mandirs' web addresses go in the page's address so Toran can show their
  events, like any other choice on that page; we don't keep them.
  Clearing the site's data in your browser forgets who you follow.
- **Telling us about an event, or asking for a correction.** We keep only
  what you type into the form: the event's details, or what's wrong and on
  which page. We don't ask who you are or record your IP address, so please
  don't type anyone's name or contact details. Correction and removal
  requests are deleted 90 days after we've dealt with them.
- **Visitor numbers.** Toran counts how many times each public page is
  seen each day, and how often events are added to calendars or shared,
  with its own simple counter. It uses no cookies and keeps nothing about
  you: no IP address, browser or device, only the page's address and a
  running total. If your browser asks sites not to track you ("Do Not
  Track" or "Global Privacy Control"), you aren't counted at all.

## If you look after a mandir's page

| What we hold                                                      | Why                                                                       | Lawful basis                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| Your email address and login records                              | To let you log in by emailed link                                         | Contract: providing the service you asked for            |
| Your role at the mandir and any note you send with your request   | To check with the mandir that you're on its committee                     | Legitimate interests: keeping listings accurate and safe |
| Which mandir(s) you look after                                    | So you can manage that page and no other                                  | Contract                                                 |
| If a colleague invites you: your email address, for up to 14 days | So you can accept and join your mandir's committee on Toran               | Legitimate interests: letting committees share the work  |
| Which events you added or confirmed, and when                     | So listings can show "Confirmed by the mandir" and so we can fix mistakes | Legitimate interests                                     |
| For Toran's own staff only: an authenticator app link             | To protect the admin area                                                 | Legitimate interests: security                           |

Being on a mandir's committee can reveal your religious beliefs, which the
law treats as **special category data**. [We rely on your explicit
consent, which you give when you ask to look after a page or accept a
colleague's invite, and which you can withdraw at any time by pressing
"Leave" on your mandir's page or asking us to remove you. Confirm with the
DPIA, section 5.]

We don't show your name or email on the public site. Others on the same
mandir's committee can see your login email on the committee page, so
they know who else helps run it. Event listings say
"Confirmed by the mandir", not who confirmed them.

## Mandirs' own details

Mandir names, towns, postcodes, websites and public phone numbers come
from the mandirs' own websites and public registers. They describe
organisations, not people. If a mandir's published contact is a personal
email or phone number, we keep it private and use it only to contact the
committee.

## Coming later (this section will be updated before each launches)

- **Weekly digest:** your email address and postcode, nothing else. You
  can unsubscribe in one click; we delete your details 30 days later.
- **Seva rota sign-ups:** your name and one way to contact you, shared
  only with that mandir's committee. Deleted 90 days after the event.
  Under-16s need a parent's or guardian's details and the mandir's
  sign-off.
- **Forwarding posters by WhatsApp or email:** the message, any image,
  and the sender's number or address. We use them to create the listing,
  then delete the message [within 90 days].

## Who we share data with

Only these service providers ("processors"), who act on our instructions
under contract:

| Provider                                  | What for                                   | Where                                       |
| ----------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Supabase                                  | Database and login                         | London (UK) [check project region]          |
| Vercel                                    | Hosting the website                        | Servers in London; global network for speed |
| Sentry                                    | Error reports (with personal data removed) | [EU / US: check the region chosen]          |
| [Email provider, e.g. Postmark or Resend] | Sending login links (and later the digest) | [check]                                     |
| [Anthropic (Claude API)], later           | Reading forwarded posters into listings    | [check]                                     |
| [Meta (WhatsApp)], later                  | Receiving forwarded posters                | [check]                                     |

Some of these companies are based in the USA. Where data leaves the UK,
we rely on [the UK–US data bridge or the ICO's international data transfer
agreement / addendum: check each provider's terms].

We never sell data. We'd only share it with others if the law requires
it.

## How long we keep it

In short:
logins until you ask us to delete them, or 24 months after your last login
(we email first); an address typed on the login page whose link is never
opened, 7 days; decided page requests for 2 years; error reports for
about 30 days.

## Your rights

You can ask us to:

- give you a copy of your data;
- correct it;
- delete it;
- restrict or object to how we use it;
- move it to another service.

Where we rely on consent, you can withdraw it at any time. Email
[privacy@domain]. We reply within one month, and it's free.

If you're unhappy with how we've handled your data, please tell us first.
You can also complain to the Information Commissioner's Office:
ico.org.uk/make-a-complaint, 0303 123 1113.

## Cookies

We only use cookies that are needed for logging in (they keep you logged
in, and are set only when you log in). These don't need consent, so we
don't show a cookie banner. If that ever changes, we'll ask first.

## Changes

We'll update this notice when we start collecting something new, and show
the date at the top. Last updated: [date].
