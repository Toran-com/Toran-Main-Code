import { describe, expect, it } from "vitest";
import {
  parseMandirDetails,
  parsePracticalDetails,
  slugFor,
} from "@/lib/mandir-form";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const valid = {
  name: "Shree Ram Mandir",
  town: "Southall",
  region: "London",
  postcode: "ub2 4da",
  website: "shreerammandir.co.uk",
  phone: "020 8574 1234",
  tradition: "",
  calendar: "north_indian",
  charity_number: "262605",
};

describe("parseMandirDetails", () => {
  it("tidies a good form", () => {
    const result = parseMandirDetails(form(valid));
    expect(result).toEqual({
      ok: true,
      values: {
        name: "Shree Ram Mandir",
        town: "Southall",
        region: "London",
        postcode: "UB2 4DA",
        website: "https://shreerammandir.co.uk",
        phone: "020 8574 1234",
        tradition: null,
        calendar: "north_indian",
        charity_number: "262605",
        getting_there: null,
        facilities: [],
        visiting_note: null,
        opening_hours: null,
        aarti_times: null,
      },
    });
  });
  it("names the first problem", () => {
    expect(parseMandirDetails(form({ ...valid, name: "X" }))).toEqual({
      ok: false,
      error: "name",
    });
    expect(parseMandirDetails(form({ ...valid, region: "Mars" }))).toEqual({
      ok: false,
      error: "region",
    });
    expect(parseMandirDetails(form({ ...valid, postcode: "nope" }))).toEqual({
      ok: false,
      error: "postcode",
    });
  });
});

describe("parsePracticalDetails", () => {
  it("allows everything to be left empty", () => {
    expect(parsePracticalDetails(form({}))).toEqual({
      ok: true,
      values: {
        postcode: null,
        website: null,
        phone: null,
        getting_there: null,
        facilities: [],
        visiting_note: null,
        opening_hours: null,
        aarti_times: null,
      },
    });
  });
  it("rejects odd websites and phone numbers", () => {
    expect(parsePracticalDetails(form({ website: "not a site" }))).toEqual({
      ok: false,
      error: "website",
    });
    expect(parsePracticalDetails(form({ phone: "call Ramesh" }))).toEqual({
      ok: false,
      error: "phone",
    });
  });
  it("keeps a getting-there note, trimmed", () => {
    const parsed = parsePracticalDetails(
      form({
        getting_there:
          "  Free parking behind the hall.\nBus 18 stops outside. ",
      }),
    );
    expect(parsed.ok && parsed.values.getting_there).toBe(
      "Free parking behind the hall.\nBus 18 stops outside.",
    );
  });
  it("keeps personal contact details out of the note", () => {
    for (const note of [
      "Call Ramesh on 07700 900123 for parking",
      "Email parking@example.com first",
    ]) {
      expect(parsePracticalDetails(form({ getting_there: note }))).toEqual({
        ok: false,
        error: "getting_there_contact",
      });
    }
  });
  it("keeps the note short", () => {
    expect(
      parsePracticalDetails(form({ getting_there: "x".repeat(401) })),
    ).toEqual({ ok: false, error: "getting_there" });
  });
});

describe("opening times", () => {
  it("names the day that needs checking", () => {
    expect(
      parsePracticalDetails(
        form({ "open-6-0": "09:00", "close-6-0": "08:00" }),
      ),
    ).toEqual({ ok: false, error: "hours_6" });
  });
  it("keeps sessions and aartis", () => {
    expect(
      parsePracticalDetails(
        form({
          "open-7-0": "09:00",
          "close-7-0": "13:00",
          "aarti-name-0": "Rajbhog aarti",
          "aarti-time-0": "11:30",
        }),
      ),
    ).toMatchObject({
      ok: true,
      values: {
        opening_hours: [{ day: 7, opens: "09:00", closes: "13:00" }],
        aarti_times: [{ name: "Rajbhog aarti", time: "11:30" }],
      },
    });
  });
});

describe("visiting information", () => {
  it("keeps only known ticks, in the usual order", () => {
    const data = new FormData();
    for (const tick of ["jain_food", "helipad", "step_free", "step_free"]) {
      data.append("facilities", tick);
    }
    const parsed = parsePracticalDetails(data);
    expect(parsed.ok && parsed.values.facilities).toEqual([
      "step_free",
      "jain_food",
    ]);
  });
  it("keeps a short note without contact details", () => {
    expect(
      parsePracticalDetails(
        form({ visiting_note: " Please cover your head inside. " }),
      ),
    ).toMatchObject({
      ok: true,
      values: { visiting_note: "Please cover your head inside." },
    });
    expect(
      parsePracticalDetails(form({ visiting_note: "x".repeat(401) })),
    ).toEqual({ ok: false, error: "visiting_note" });
    expect(
      parsePracticalDetails(
        form({ visiting_note: "Ask for Ramesh on 07700 900123" }),
      ),
    ).toEqual({ ok: false, error: "visiting_note_contact" });
  });
});

describe("slugFor", () => {
  it("adds the town unless the name already has it", () => {
    expect(slugFor("Shree Ram Mandir", "Southall")).toBe(
      "shree-ram-mandir-southall",
    );
    expect(slugFor("Reading Hindu Temple", "Reading")).toBe(
      "reading-hindu-temple",
    );
    expect(slugFor("Hindu Cultural & Religious Centre", "Leicester")).toBe(
      "hindu-cultural-and-religious-centre-leicester",
    );
  });
});
