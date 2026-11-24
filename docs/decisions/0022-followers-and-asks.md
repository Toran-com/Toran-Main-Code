# 0022. Count follows and asks to post, as totals, to show committees what their page brings

Date: 2026-11-24
Status: Proposed

## Context

Toran needs mandirs to post, and families to look, and each waits for the
other. What wins a committee over is proof that people want its page: "94
people follow your mandir and 31 asked you to post." But following stays on
the visitor's phone (decision 0006), so Toran couldn't say how many follow a
mandir, and a family whose mandir isn't on Toran had no way to ask for it.

## Decision

Toran's own counter (decision 0015) also adds up presses, per page per day,
with nothing about who pressed: Follow and Unfollow on a mandir's page (its
followers are every Follow less every Unfollow), "Ask them to post on
Toran" on the page of a mandir whose committee isn't on Toran or has
nothing coming up, and "I went" on an event's page. A committee sees its
own mandir's totals, with seva places taken on Toran, on its Numbers page;
Toran admins see every mandir's followers and asks on /ops/stats, to plan
visits. Who follows a mandir still stays on their phone.

## Consequences

- Committees, and Toran when it visits them, can see what a page brings.
- Pressing Follow now sends Toran one thing, "one more for this mandir",
  where before it sent nothing. The privacy notice and DPIA say so. As for
  visits, nothing about the person is kept, and browsers that ask not to be
  tracked aren't counted.
- The totals are a guide, not an audit: anyone could press many times or
  call the counter, and a phone that clears its data and follows again
  counts twice. Each phone asks a mandir only once, and follows made by
  moving to a new phone, or by a family account syncing, aren't counted.
- Undoing "I went" doesn't take it off the total.
