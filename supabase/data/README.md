# Starting data

Public information about mandirs, loaded by migrations. No personal details:
no committee members' names, emails or mobile numbers.

| File                 | What it is                                                                                      | Loaded by                          |
| -------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `mandirs.csv`        | The 106 mandirs from the outreach and audit lists (built by `scripts/build_directory.py`)       | `20261012110000_initial_directory` |
| `mandir_details.csv` | Postcodes, websites and public phone numbers found in October 2026, with the source of each row | `20261013090000_mandir_details`    |

Both migrations only add what's missing. Anything a mandir's committee or a
Toran admin changes later is never overwritten.

## How the details were checked

- **Postcodes:** taken from the mandir's own website, or where two
  independent sources agree (for example the Charity Commission register and
  a council directory). A charity's registered address can be a trustee's
  home, so a register entry alone was only used when the address is clearly
  the temple building (for example "The Temple, 36 Alexandra Road").
- **Phone numbers:** only from the mandir's own website. Numbers on the
  charity register can be a trustee's personal phone, so they were left out.
- **Websites:** only where the charity register or the mandir's own listing
  names one.

## Mandirs to check by hand

Found during the research; worth a phone call or a look before the pilot.

**No temple building yet** (community groups that meet elsewhere). Consider
whether they belong on a mandir list:

- Hindu Samaj Northstowe: no venue; families travel to London or
  Birmingham (BBC, June 2026).
- Exeter Hindu Cultural Centre: meets monthly at Exwick Parish Hall
  (EX4 2AB); a temple is planned.
- Hindu Devi Mandir Milton Keynes: still raising funds for a temple.
- Chelmsford Hindu Society: no permanent mandir found.
- Gloucester Pillaiyar (Hindu) Temple: only a registered contact address.

**Venue may have changed:**

- Bharat Hindu Samaj, Peterborough: the council sold its building; a High
  Court challenge was reported in July 2026.
- ISKCON Birmingham: its website says the temple is closed for building
  work; Sunday programmes are held elsewhere.
- Sivayogam Muthumari Amman Kovil, Tooting: the charity is now registered
  in Croydon; the Tooting building faced closure in 2010.
- Dharma Mandir Newport: registered at an office unit.

**Possible duplicate:** Shri Swaminarayan Mandir London (Harrow) may be the
same temple as Shree Kutch Satsang Swaminarayan Temple, Kenton
(Westfield Lane, HA3 9EA).

**Postcode left blank because sources disagree:** Shree Krishna Temple
Coventry (CV1 4FB or CV1 4EZ), Indian Community Centre Belfast and
ISKCON Belfast.

**Postcode to double-check:** Shree Lakshmi Narayan Hindu Temple, Bradford.
Its own website uses both BD3 9JY and BD3 9LS; BD3 9JY, from the contact
page, was used.
