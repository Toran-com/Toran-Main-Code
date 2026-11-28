import { describe, expect, it } from "vitest";
import {
  bearerKey,
  checkApiEvent,
  hashApiKey,
  isExternalId,
  newApiKey,
  readApiEvent,
} from "@/lib/events-api";

const now = new Date("2026-11-02T10:00:00Z");

describe("keys", () => {
  it("makes a long random key, keeping only its hash and start", () => {
    const a = newApiKey();
    const b = newApiKey();
    expect(a.key).toMatch(/^toran_[A-Za-z0-9_-]{43}$/);
    expect(a.key).not.toBe(b.key);
    expect(a.hash).toBe(hashApiKey(a.key));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.prefix).toBe(a.key.slice(0, 10));
  });

  it("reads the key from the Authorization header only", () => {
    const { key } = newApiKey();
    expect(bearerKey(`Bearer ${key}`)).toBe(key);
    expect(bearerKey(`bearer ${key}`)).toBe(null);
    expect(bearerKey(key)).toBe(null);
    expect(bearerKey("Bearer toran_short")).toBe(null);
    expect(bearerKey(null)).toBe(null);
  });

  it("takes ids a booking system would use", () => {
    expect(isExternalId("diwali-2026")).toBe(true);
    expect(isExternalId("evt_123:456@site.org")).toBe(true);
    expect(isExternalId("")).toBe(false);
    expect(isExternalId("has space")).toBe(false);
    expect(isExternalId("a/b")).toBe(false);
    expect(isExternalId("x".repeat(101))).toBe(false);
  });
});

describe("readApiEvent", () => {
  it("reads an event as the committee form would send it", () => {
    const read = readApiEvent({
      id: "diwali-2026",
      title: " Diwali Lakshmi puja ",
      date: "2026-11-08",
      time: "18:30",
      end_time: "20:30",
      booking_required: true,
      tickets_url: "https://mandir.example/book",
      languages: ["gu", "en"],
      link: "https://mandir.example/diwali",
      extra: "ignored",
    });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.event.input).toMatchObject({
      title: "Diwali Lakshmi puja",
      date: "2026-11-08",
      time: "18:30",
      end_time: "20:30",
      repeat: "none",
      kind: "festival",
      tickets: "needed",
      languages: ["gu", "en"],
    });
    expect(read.event.link).toBe("https://mandir.example/diwali");
    expect(read.event.cancelled).toBe(false);
  });

  it("guesses the kind if it isn't given", () => {
    const read = readApiEvent({ title: "Sunday bhajans", date: "2026-11-08" });
    expect(read.ok && read.event.input.kind).toBe("bhajan");
  });

  it("marks it cancelled", () => {
    const read = readApiEvent({
      title: "Diwali",
      date: "2026-11-08",
      status: "cancelled",
    });
    expect(read.ok && read.event.cancelled).toBe(true);
  });

  it("names the field that's wrong", () => {
    const problem = (body: unknown) => {
      const read = readApiEvent(body);
      return read.ok ? null : read.problem.field;
    };
    expect(problem([])).toBe("");
    expect(problem("text")).toBe("");
    expect(problem({ title: 5 })).toBe("title");
    expect(problem({ languages: "gu" })).toBe("languages");
    expect(problem({ booking_required: "yes" })).toBe("booking_required");
    expect(problem({ status: "postponed" })).toBe("status");
    expect(problem({ link: "mandir.example" })).toBe("link");
  });
});

describe("checkApiEvent", () => {
  const check = (body: Record<string, unknown>) => {
    const read = readApiEvent({ title: "Diwali", date: "2026-11-08", ...body });
    if (!read.ok) throw new Error("not read");
    return checkApiEvent(read.event, now);
  };

  it("passes a good event, all day without a time", () => {
    const checked = check({});
    expect(checked.ok).toBe(true);
    expect(checked.ok && checked.event.allDay).toBe(true);
  });

  it("works out every date of a repeating event", () => {
    const checked = check({
      time: "20:00",
      repeat: "daily",
      until: "2026-11-10",
    });
    expect(checked.ok && checked.event.occurrences).toHaveLength(3);
  });

  it("explains what's wrong, field by field", () => {
    const fail = (body: Record<string, unknown>) => {
      const checked = check(body);
      return checked.ok ? null : checked.problem;
    };
    expect(fail({ date: "8 November" })).toMatchObject({ field: "date" });
    expect(fail({ date: "2026-10-01" })).toMatchObject({ field: "date" });
    expect(fail({ time: "6.30pm" })?.field).toBe("time");
    expect(fail({ time: "18:30", end_time: "17:00" })?.field).toBe("end_time");
    expect(fail({ kind: "party" })?.message).toContain("festival, aarti");
    expect(fail({ repeat: "yearly" })?.field).toBe("repeat");
    expect(fail({ languages: ["fr"] })?.field).toBe("languages");
    expect(fail({ venue_name: "Harrow Leisure Centre" })?.field).toBe(
      "venue_name",
    );
    expect(fail({ title: "D" })?.field).toBe("title");
  });
});
