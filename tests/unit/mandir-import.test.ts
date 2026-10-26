import { describe, expect, it } from "vitest";
import { checkMandirRows, lookalike, type Listed } from "@/lib/mandir-import";

const listed: Listed[] = [
  {
    slug: "shree-ram-mandir-leicester",
    name: "Shree Ram Mandir",
    town: "Leicester",
    postcode: "LE4 6AR",
    website: "https://www.shreeram.org.uk/",
    phone: "0116 266 0000",
  },
];

const row = (
  name: string,
  town = "Leicester",
  more: Partial<{ postcode: string; website: string; phone: string }> = {},
) => ({
  name,
  town,
  region: "East Midlands",
  tradition: null,
  calendar: null,
  charity_number: null,
  postcode: more.postcode ?? null,
  website: more.website ?? null,
  phone: more.phone ?? null,
  getting_there: null,
  facilities: [],
  visiting_note: null,
  opening_hours: null,
  aarti_times: null,
});

describe("lookalike", () => {
  it("spots the same postcode, website or phone", () => {
    expect(
      lookalike(row("Other", "Leicester", { postcode: "LE4 6AR" }), listed)
        ?.because,
    ).toBe("postcode");
    expect(
      lookalike(
        row("Other", "Derby", { website: "http://shreeram.org.uk" }),
        listed,
      )?.because,
    ).toBe("website");
    expect(
      lookalike(row("Other", "Derby", { phone: "+44 116 266 0000" }), listed)
        ?.because,
    ).toBe("phone");
  });

  it("spots nearly the same name in the same town", () => {
    expect(lookalike(row("Shri Ram Mandir Leicester"), listed)?.because).toBe(
      "name",
    );
    expect(lookalike(row("Ram Temple"), listed)?.because).toBe("name");
    // Different mandir, or the same name somewhere else.
    expect(lookalike(row("Shree Jalaram Mandir"), listed)).toBeNull();
    expect(lookalike(row("Shree Ram Mandir", "Leeds"), listed)).toBeNull();
  });
});

describe("checkMandirRows", () => {
  it("checks each row like the form, and warns about lookalikes", () => {
    const text = [
      "name\ttown\tregion\tpostcode\twebsite\tphone\ttradition",
      "Geeta Bhavan\tDerby\teast midlands\tDE1 1AA\tgeetabhavan.org\t01332 000000\tSanatan",
      "Shri Ram Mandir\tLeicester\tEast Midlands\tLE5 1ZZ",
      "Nowhere Mandir\tNowhere\tAtlantis\tXX1",
      "Too few\tcells",
      "",
      "Geeta Bhavan Mandir\tDerby\tEast Midlands\tDE1 1AA",
    ].join("\n");
    const checked = checkMandirRows(text, listed);
    expect(checked.map((c) => [c.line, c.status])).toEqual([
      [2, "new"],
      [3, "duplicate"],
      [4, "problem"],
      [5, "problem"],
      [7, "duplicate"],
    ]);
    expect(checked[0]).toMatchObject({
      values: {
        name: "Geeta Bhavan",
        region: "East Midlands",
        postcode: "DE1 1AA",
        website: "https://geetabhavan.org",
        tradition: "Sanatan",
      },
    });
    expect(checked[1]).toMatchObject({
      like: "Shree Ram Mandir, Leicester",
      because: "name",
    });
    expect(checked[2]).toMatchObject({ problem: "region" });
    expect(checked[3]).toMatchObject({ problem: "columns" });
    // Like a row earlier in the same paste.
    expect(checked[4]).toMatchObject({
      like: "line 2 of this paste",
      because: "postcode",
    });
  });

  it("takes commas when there are no tabs", () => {
    expect(
      checkMandirRows("Hindu Mandir,Glasgow,Scotland,G3 7LH", [])[0],
    ).toMatchObject({ status: "new", values: { town: "Glasgow" } });
  });
});
