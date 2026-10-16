import { describe, expect, it } from "vitest";
import {
  checkRole,
  checkShift,
  placesTaken,
  rotaMessage,
  shiftLabel,
} from "@/lib/seva";

describe("checkRole", () => {
  it("accepts a role, tidying spaces", () => {
    expect(
      checkRole({ name: " Kitchen ", description: "", dbs: false }),
    ).toEqual({
      ok: true,
      role: { name: "Kitchen", description: null, needs_dbs: false },
    });
  });

  it("rejects a missing name or long description", () => {
    expect(checkRole({ name: "K", description: "", dbs: false })).toEqual({
      ok: false,
      error: "role",
    });
    expect(
      checkRole({ name: "Kitchen", description: "x".repeat(281), dbs: false }),
    ).toEqual({ ok: false, error: "description" });
  });
});

describe("checkShift", () => {
  it("turns London times into moments", () => {
    expect(
      checkShift({
        date: "2026-11-08",
        from: "17:00",
        to: "20:00",
        needed: "4",
      }),
    ).toEqual({
      ok: true,
      shift: {
        starts_at: "2026-11-08T17:00:00.000Z",
        ends_at: "2026-11-08T20:00:00.000Z",
        needed: 4,
      },
    });
  });

  it.each([
    [{ to: "16:00" }, "shift"],
    [{ to: "17:00" }, "shift"],
    [{ date: "" }, "shift"],
    [{ needed: "0" }, "needed"],
    [{ needed: "2.5" }, "needed"],
    [{ needed: "501" }, "needed"],
  ])("rejects %o", (change, error) => {
    expect(
      checkShift({
        date: "2026-11-08",
        from: "17:00",
        to: "20:00",
        needed: "4",
        ...change,
      }),
    ).toEqual({ ok: false, error });
  });
});

describe("rotaMessage", () => {
  it("lists each role's shifts in order, ready for WhatsApp", () => {
    const message = rotaMessage("Diwali celebrations", "Sun 8 Nov, 6:30pm", [
      {
        name: "Kitchen",
        description: "Cooking and serving prasad",
        needs_dbs: false,
        shifts: [
          {
            starts_at: "2026-11-08T20:00:00Z",
            ends_at: "2026-11-08T22:00:00Z",
            needed: 1,
          },
          {
            starts_at: "2026-11-08T17:00:00Z",
            ends_at: "2026-11-08T20:00:00Z",
            needed: 4,
          },
        ],
      },
      {
        name: "Children's corner",
        description: null,
        needs_dbs: true,
        shifts: [
          {
            starts_at: "2026-11-08T18:00:00Z",
            ends_at: "2026-11-08T19:30:00Z",
            needed: 2,
          },
        ],
      },
      { name: "Parking", description: null, needs_dbs: false, shifts: [] },
    ]);
    expect(message).toBe(
      [
        "Seva for Diwali celebrations (Sun 8 Nov, 6:30pm)",
        "*Kitchen*\nCooking and serving prasad\n• Sun 8 Nov, 5pm–8pm: 4 people\n• Sun 8 Nov, 8pm–10pm: 1 person",
        "*Children's corner* (DBS check needed)\n• Sun 8 Nov, 6pm–7:30pm: 2 people",
        "Reply here if you can help. 🙏",
      ].join("\n\n"),
    );
  });

  it("labels a shift with its day and times", () => {
    expect(shiftLabel("2026-10-17T16:00:00Z", "2026-10-17T18:30:00Z")).toBe(
      "Sat 17 Oct, 5pm–7:30pm",
    );
  });
});

describe("placesTaken", () => {
  it("adds the committee's count to slots taken on Toran", () => {
    expect(placesTaken({ needed: 7, filled_offline: 2, taken_online: 1 })).toBe(
      3,
    );
  });

  it("never says more than the shift needs", () => {
    expect(placesTaken({ needed: 2, filled_offline: 2, taken_online: 1 })).toBe(
      2,
    );
  });

  it("counts nothing for a shift without counts", () => {
    expect(placesTaken({ needed: 4 })).toBe(0);
  });
});

describe("rotaMessage when volunteers can take slots on Toran", () => {
  const rota = [
    {
      name: "Kitchen",
      description: null,
      needs_dbs: false,
      shifts: [
        {
          starts_at: "2026-11-08T17:00:00Z",
          ends_at: "2026-11-08T20:00:00Z",
          needed: 4,
          filled_offline: 1,
          taken_online: 2,
        },
      ],
    },
    {
      name: "Children's corner",
      description: null,
      needs_dbs: true,
      shifts: [
        {
          starts_at: "2026-11-08T17:00:00Z",
          ends_at: "2026-11-08T20:00:00Z",
          needed: 2,
        },
      ],
    },
  ];
  const message = rotaMessage("Diwali", "Sun 8 Nov, 6:30pm", rota, true);

  it("says how many places are taken", () => {
    expect(message).toContain("• Sun 8 Nov, 5pm–8pm: 3 of 4 taken");
  });

  it("keeps the number needed for roles that need a DBS check", () => {
    expect(message).toContain(
      "*Children's corner* (DBS check needed)\n• Sun 8 Nov, 5pm–8pm: 2 people",
    );
  });

  it("points to the link instead of asking for replies", () => {
    expect(message).toMatch(/Take a slot at the link below/);
    expect(message).not.toMatch(/Reply here/);
  });
});
