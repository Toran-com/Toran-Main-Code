import { describe, expect, it } from "vitest";
import { cleanPlanned, cleanSaved, combineSaved } from "@/lib/family-accounts";

const A = "18e01f23-0b51-4b19-bcea-8e68457f7a50";
const B = "6ae51ec8-703c-4255-a7d4-40de6ef8718c";

describe("family accounts' saved lists", () => {
  it("keeps only real mandir addresses and planned events", () => {
    expect(
      cleanSaved({
        following: [
          "shree-sample-mandir",
          "Not A Slug!",
          "shree-sample-mandir",
        ],
        plan: [
          { id: A, at: "2027-01-01T18:00:00Z" },
          { id: "nope", at: "2027-01-01T18:00:00Z" },
          { id: B, at: "not a date" },
          { id: A, at: "2027-02-01T18:00:00Z" },
        ],
      }),
    ).toEqual({
      following: ["shree-sample-mandir"],
      plan: [{ id: A, at: "2027-01-01T18:00:00Z" }],
    });
    expect(cleanSaved(null)).toEqual({ following: [], plan: [] });
    expect(cleanPlanned("x")).toEqual([]);
  });

  it("keeps at most 30 of each", () => {
    const many = Array.from({ length: 40 }, (_, i) => `mandir-${i}`);
    expect(cleanSaved({ following: many }).following).toHaveLength(30);
  });

  const phone = {
    following: ["one"],
    plan: [{ id: A, at: "2027-01-01T18:00:00Z" }],
  };
  const account = {
    following: ["two"],
    plan: [{ id: B, at: "2027-03-01T18:00:00Z" }],
  };

  it("puts the phone and the account together the first time", () => {
    expect(combineSaved(phone, account, true)).toEqual({
      following: ["one", "two"],
      plan: [...phone.plan, ...account.plan],
    });
    // Nothing on the account yet: the phone's lists are kept, to save.
    expect(combineSaved(phone, null, true)).toEqual(phone);
  });

  it("after that, the account is the record", () => {
    expect(combineSaved(phone, account, false)).toEqual(account);
    // Deleted from the account: cleared here too.
    expect(combineSaved(phone, null, false)).toEqual({
      following: [],
      plan: [],
    });
  });
});
