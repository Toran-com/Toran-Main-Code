"""Builds the initial mandir directory from the two research lists.

Inputs (from the research repo, milanapatel-star/test):
  audit/mandirs.csv       30 mandirs in NW London and Leicester (with postcodes)
  outreach/mandirs_uk.csv 91 mandirs across the UK

Output: supabase/data/mandirs.csv (public fields only: no emails or other
contact details), and the SQL migration that loads it.

Usage: python3 scripts/build_directory.py <research-repo> <out-dir>
"""
import csv
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

research, out = Path(sys.argv[1]), Path(sys.argv[2])

# Where the outreach list's region is wrong or a city name, use the region.
REGION_FIX = {"Leicester": "East Midlands"}
TOWN_REGION_FIX = {"Watford": "East of England"}
TOWN_FIX = {"London W1": "Soho"}

# Audit entries that are the same mandir as an outreach entry (audit id ->
# outreach name). Checked by hand against names, towns and websites.
SAME_AS = {
    "2": "Shri Sanatan Hindu Mandir (Shri Vallabh Nidhi UK)",
    "7": "Harisumiran Hindu Swaminarayan Temple (YDS UK)",
    "13": "Shree Ram Mandir",
    "15": "Shree Jalaram Mandir Greenford",
    "16": "Shree Hindu Temple and Community Centre",
    "17": "BAPS Shri Swaminarayan Mandir Leicester",
    "18": "Shree Sanatan Mandir",
    "19": "Shree Jalaram Prarthana Mandal",
    "20": "ISKCON Leicester",
    "23": "Geeta Bhavan Leicester",
    "25": "Shirdi Sai Baba Temple Leicester",
    "26": "Shree Hanuman Temple Salangpur Dham",
    "27": "Shree Ram Mandir (Lohana Mahajan Leicester)",
    "28": "Shree Shakti Mandir",
}
# Left out: probably the same as audit 3 (Shree Swaminarayan Mandir,
# Kingsbury), which locals also call "Kingsbury Temple". Check before adding.
LEFT_OUT = {"12": "Kingsbury Temple: likely duplicate of Shree Swaminarayan Mandir Kingsbury"}

NOT_OWN_SITE = ("charitycommission.gov.uk", "facebook.com", "iskcondesiretree.com",
                "centres.iskcon.org", "hindu-temples.uk", "directory.", "gov.uk",
                "shaivam.org", "sisnambalava.org.uk", "com-pla", "iskconmandir.com",
                "communitydirectory")

TRADITIONS = [  # (pattern, tradition, calendar)
    (r"\bBAPS\b", "Swaminarayan (BAPS)", "gujarati"),
    (r"ISSO", "Swaminarayan (ISSO)", "gujarati"),
    (r"Maninagar", "Swaminarayan (Maninagar)", "gujarati"),
    (r"Swaminarayan|Loyadham", "Swaminarayan", "gujarati"),
    (r"ISKCON|Bhaktivedanta", "ISKCON (Gaudiya Vaishnava)", "other"),
    (r"Murugan|Amman|Kovil|Vinayagar|Pillaiyar|Ghanapathy|Ayyappan|Sivan|Perumal|Venkateswara|Padmavathi|Mahalakshmi", "South Indian", "tamil"),
    (r"Shirdi|Sai ?baba", "Shirdi Sai Baba", None),
    (r"Jalaram", "Jalaram Bapa", "gujarati"),
    (r"Haveli|Vallabh", "Pushtimarg", "gujarati"),
    (r"Balak Nath", "Baba Balak Nath", "north_indian"),
]


CONTACT_PAGE = re.compile(r"/(contact|contactus|contact-us|visit-us|how-to-find-us|about/contact-us|useful-info|home/meta-description)", re.I)


def own_site(url):
    """The mandir's own web page: its home page, or its page on a shared
    site (e.g. a temple's page on swaminarayan.faith or baps.org)."""
    if not url or not url.startswith("http"):
        return None
    if any(bad in url for bad in NOT_OWN_SITE):
        return None
    p = urlparse(url)
    if not p.netloc:
        return None
    if p.path in ("", "/") or CONTACT_PAGE.search(p.path) or p.query:
        return f"https://{p.netloc}/"
    return f"https://{p.netloc}{p.path}"


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def tradition(name, website):
    for pat, trad, cal in TRADITIONS:
        if re.search(pat, name, re.I) or (website and "swaminarayan.faith" in website and pat == "ISSO"):
            return trad, cal
    return None, None


def postcode(pc):
    pc = (pc or "").strip().upper()
    return pc if re.fullmatch(r"[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}", pc) else None


rows = []
outreach = list(csv.DictReader(open(research / "outreach/mandirs_uk.csv")))
audit = list(csv.DictReader(open(research / "audit/mandirs.csv")))
audit_by_outreach = {v: k for k, v in SAME_AS.items()}
audit_ids = {r["id"]: r for r in audit}

for r in outreach:
    a = audit_ids.get(audit_by_outreach.get(r["mandir"], ""))
    town = TOWN_FIX.get(r["town"].strip(), r["town"].strip())
    region = TOWN_REGION_FIX.get(town, REGION_FIX.get(r["region"], r["region"]))
    site = own_site((a or {}).get("website")) or own_site(r["source"])
    rows.append({"name": r["mandir"].strip(), "town": town, "region": region,
                 "postcode": postcode((a or {}).get("postcode")), "website": site})

for r in audit:
    if r["id"] in SAME_AS or r["id"] in LEFT_OUT:
        continue
    town = r["locality"].strip() if r["cluster"] == "nw-london" else "Leicester"
    region = "London" if r["cluster"] == "nw-london" else "East Midlands"
    rows.append({"name": r["name"].strip(), "town": town, "region": region,
                 "postcode": postcode(r["postcode"]), "website": own_site(r["website"])})

seen = set()
for row in rows:
    row["tradition"], row["calendar"] = tradition(row["name"], row["website"])
    base = slugify(row["name"])
    slug = base if row["town"].lower() in base else f"{base}-{slugify(row['town'])}"
    n = 2
    while slug in seen:
        slug, n = f"{base}-{slugify(row['town'])}-{n}", n + 1
    seen.add(slug)
    row["slug"] = slug

rows.sort(key=lambda r: (r["region"], r["town"], r["name"]))
fields = ["slug", "name", "town", "region", "postcode", "website", "tradition", "calendar"]
with open(out / "supabase/data/mandirs.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
    w.writeheader()
    for r in rows:
        w.writerow({k: r[k] or "" for k in fields})


def q(v):
    return "null" if v in (None, "") else "'" + str(v).replace("'", "''") + "'"


values = ",\n".join(
    f"  ({q(r['slug'])}, {q(r['name'])}, {q(r['town'])}, {q(r['region'])}, {q(r['postcode'])}, "
    f"{q(r['website'])}, {q(r['tradition'])}, {q(r['calendar'])}{'::public.calendar_tradition' if r['calendar'] else ''})"
    for r in rows)
sql = f"""-- Initial mandir directory: {len(rows)} mandirs from Toran's research lists
-- (built by scripts/build_directory.py from supabase/data/mandirs.csv).
-- Public fields only. Adds missing mandirs and never overwrites edits made
-- since, so it is safe to run on a database that already has some of them.

insert into public.mandirs (slug, name, town, region, postcode, website, tradition, calendar)
values
{values}
on conflict (slug) do nothing;
"""
(out / "supabase/migrations/20261012110000_initial_directory.sql").write_text(sql)
print(f"{len(rows)} mandirs ({len(outreach)} outreach + {len(audit) - len(SAME_AS) - len(LEFT_OUT)} audit-only; "
      f"{len(SAME_AS)} merged, {len(LEFT_OUT)} left out)")
print("with postcode:", sum(1 for r in rows if r["postcode"]), "| with own website:", sum(1 for r in rows if r["website"]),
      "| with tradition:", sum(1 for r in rows if r["tradition"]))
