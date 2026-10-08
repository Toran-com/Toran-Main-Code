# 0007. Set up as a limited company

Date: 2026-10-07
Status: Accepted

## Context

Two founders, a free service for mandirs, and a possible paid tier or
funding later. We need limited liability, a clear owner for the code, the
data and the name, and something mandirs and the ICO can deal with.

## Decision

Register a private company limited by shares at Companies House, with both
founders as directors and shareholders. Do this before any production code
is written or any personal data is collected.

## Consequences

- Personal liability is limited, and the company (not either founder) owns
  the code, data, domain and name.
- Costs and admin: incorporation fee (about £100 online; check the current
  gov.uk fees page), each director's identity verification with Companies
  House, annual accounts, a confirmation statement and a corporation tax
  return each year.
- The registered office address and directors' names are public. Use a
  registered office service rather than a home address if privacy matters.
- Needs, at the same time:
  - a shareholders' agreement between the founders (split, vesting, what
    happens if one leaves, who decides what)
  - an IP assignment from each founder to the company, covering everything
    built so far, including this repo
  - a business bank account, and corporation tax registration with HMRC
  - ICO registration in the company's name (decision 0006)
- A community interest company (CIC) was considered; it suits a
  not-for-profit mission but limits taking investment and paying out
  profits. A limited company can still adopt a social mission in its
  articles.
