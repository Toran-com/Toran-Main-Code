import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetLimitForTests,
  checkPrivacy,
  DEMO_POSTERS,
  demoPoster,
  draftWhen,
  readDemoPoster,
  underLimit,
} from "@/lib/poster-demo";

const holi = demoPoster("holi")!;
const patrika = demoPoster("patrika")!;

const event = (over: Partial<Record<string, string>> = {}) => ({
  title: "Holika Dahan",
  date: "2027-03-21",
  time: "19:30",
  summary: "Bonfire in the mandir car park, with parikrama and prasad.",
  repeat: "none" as const,
  until: "",
  title_gu: "",
  summary_gu: "",
  kind: "festival",
  ...over,
});

function fakeClient(events: unknown[]) {
  const create = vi.fn().mockResolvedValue({
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify({ events }) }],
  });
  return { create, client: { beta: { messages: { create } } } as never };
}

const picture = async () => Buffer.from("poster");

beforeEach(() => _resetLimitForTests());

describe("the sample posters", () => {
  it("each has its picture, full size (JPEG) and small (WebP)", () => {
    const file = (name: string) =>
      readFileSync(path.join(process.cwd(), "public", "demo-posters", name));
    for (const p of DEMO_POSTERS) {
      expect(file(`${p.id}.jpg`).subarray(0, 2)).toEqual(
        Buffer.from([0xff, 0xd8]),
      );
      const small = file(`${p.id}-small.webp`);
      expect(small.subarray(0, 4).toString()).toBe("RIFF");
      expect(small.subarray(8, 12).toString()).toBe("WEBP");
    }
  });

  it("are read before their events, so the demo never runs out", () => {
    for (const p of DEMO_POSTERS) expect(p.readOn).toBe("2027-02-01");
  });
});

describe("draftWhen", () => {
  it("gives the day and time as families read them", () => {
    expect(draftWhen("2027-03-21", "19:30")).toBe(
      "Sunday 21 March 2027 · 7:30pm",
    );
    expect(draftWhen("2027-04-15", "12:00")).toBe(
      "Thursday 15 April 2027 · 12pm",
    );
    expect(draftWhen("2027-03-27", "")).toBe("Saturday 27 March 2027");
  });
});

describe("checkPrivacy", () => {
  it("says the name and number were left out when they were", () => {
    expect(checkPrivacy(holi, [event()])).toEqual({
      leftOut: ["Rameshbhai Patel's name and phone number"],
      keptIn: [],
    });
  });

  it("owns up when a name or number got through", () => {
    expect(
      checkPrivacy(holi, [event({ summary: "Call Rameshbhai for a stall." })]),
    ).toEqual({
      leftOut: [],
      keptIn: ["Rameshbhai Patel's name and phone number"],
    });
    expect(
      checkPrivacy(patrika, [event({ summary_gu: "સંપર્ક: મીનાબેન" })]).keptIn,
    ).toHaveLength(1);
  });

  it("matches whole English words only", () => {
    expect(
      checkPrivacy(patrika, [event({ summary: "A seminar on the Gita." })])
        .keptIn,
    ).toEqual([]);
  });
});

describe("readDemoPoster", () => {
  it("reads a sample poster into drafts, as of the day it went up", async () => {
    const { create, client } = fakeClient([
      {
        title: "Holika Dahan",
        title_gu: "",
        date: "2027-03-21",
        time: "19:30",
        summary: "Bonfire in the mandir car park, with parikrama and prasad.",
        summary_gu: "",
        kind: "festival",
      },
    ]);
    let clock = 1_000_000;
    const reading = await readDemoPoster("holi", picture, {
      client,
      now: () => (clock += 3_200),
    });
    expect(create.mock.calls[0][0].system).toContain("Today is 2027-02-01.");
    expect(create.mock.calls[0][0].system).toContain(
      "Shree Sample Mandir, Anytown",
    );
    expect(reading).toMatchObject({
      ok: true,
      drafts: [
        {
          title: "Holika Dahan",
          when: "Sunday 21 March 2027 · 7:30pm",
          kind: "Festival",
        },
      ],
      seconds: 3.2,
      leftOut: ["Rameshbhai Patel's name and phone number"],
      keptIn: [],
    });
  });

  it("makes nothing up when there are no dated events", async () => {
    const { client } = fakeClient([]);
    expect(await readDemoPoster("hours", picture, { client })).toMatchObject({
      ok: true,
      drafts: [],
      leftOut: [],
      keptIn: [],
    });
  });

  it("reads only Toran's own sample posters", async () => {
    const { create, client } = fakeClient([]);
    expect(await readDemoPoster("my-photo", picture, { client })).toEqual({
      ok: false,
      error: "unknown",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("is off without an Anthropic key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(await readDemoPoster("holi", picture)).toEqual({
      ok: false,
      error: "off",
    });
    vi.unstubAllEnvs();
  });

  it("passes on a refusal", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ stop_reason: "refusal", content: [] });
    const client = { beta: { messages: { create } } } as never;
    expect(await readDemoPoster("holi", picture, { client })).toEqual({
      ok: false,
      error: "refused",
    });
  });
});

describe("underLimit", () => {
  it("allows a dozen readings an hour from one server", () => {
    const start = 5_000_000;
    for (let i = 0; i < 12; i++) expect(underLimit(start + i)).toBe(true);
    expect(underLimit(start + 100)).toBe(false);
    expect(underLimit(start + 3_600_001)).toBe(true);
  });
});
