import { describe, expect, it, vi } from "vitest";
import { readPoster, toEventInputs } from "@/lib/poster-reader";
import { posterFrom } from "@/lib/posters";

const TODAY = "2026-10-25";

const answer = {
  events: [
    {
      title: "Diwali Lakshmi puja",
      title_gu: "દિવાળી લક્ષ્મી પૂજન",
      date: "2026-11-14",
      time: "18:30",
      summary: "Lakshmi puja and aarti, with prasad afterwards.",
      summary_gu: "",
      kind: "festival",
    },
    {
      title: "Annakut darshan",
      title_gu: "",
      date: "2026-11-15",
      time: "",
      summary: "",
      summary_gu: "",
      kind: "aarti",
    },
  ],
};

describe("toEventInputs", () => {
  it("turns Claude's answer into what the poster form sends", () => {
    expect(toEventInputs(answer, TODAY)).toEqual([
      {
        title: "Diwali Lakshmi puja",
        date: "2026-11-14",
        time: "18:30",
        summary: "Lakshmi puja and aarti, with prasad afterwards.",
        repeat: "none",
        until: "",
        title_gu: "દિવાળી લક્ષ્મી પૂજન",
        summary_gu: "",
        kind: "festival",
      },
      {
        title: "Annakut darshan",
        date: "2026-11-15",
        time: "",
        summary: "",
        repeat: "none",
        until: "",
        title_gu: "",
        summary_gu: "",
        kind: "aarti",
      },
    ]);
  });

  it("drops past, undated and nameless events", () => {
    const events = toEventInputs(
      {
        events: [
          { ...answer.events[0], date: "2026-10-20" },
          { ...answer.events[0], date: "14 November" },
          { ...answer.events[0], title: "  " },
          "not an event",
        ],
      },
      TODAY,
    );
    expect(events).toEqual([]);
  });

  it("treats an unreadable time as all day, and guesses an unknown kind", () => {
    const [event] = toEventInputs(
      {
        events: [{ ...answer.events[0], time: "6.30pm", kind: "party" }],
      },
      TODAY,
    );
    expect(event.time).toBe("");
    expect(event.kind).toBe("festival");
  });

  it("keeps text within the form's limits", () => {
    const [event] = toEventInputs(
      { events: [{ ...answer.events[0], summary: "x".repeat(500) }] },
      TODAY,
    );
    expect(event.summary).toHaveLength(280);
  });

  it("returns nothing for an answer of the wrong shape", () => {
    expect(toEventInputs(null, TODAY)).toEqual([]);
    expect(toEventInputs({ events: "none" }, TODAY)).toEqual([]);
  });
});

function fakeClient(reply: object) {
  const create = vi.fn().mockResolvedValue(reply);
  return { create, client: { beta: { messages: { create } } } as never };
}

const picture = { data: Buffer.from("poster"), type: "image/jpeg" as const };
const context = { mandir: "Shree Example Mandir, Leicester", today: TODAY };

describe("readPoster", () => {
  it("sends the picture and reads the events off the answer", async () => {
    const { create, client } = fakeClient({
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(answer) }],
    });
    const read = await readPoster(picture, context, client);
    expect(read.ok && read.events.map((e) => e.title)).toEqual([
      "Diwali Lakshmi puja",
      "Annakut darshan",
    ]);
    const request = create.mock.calls[0][0];
    expect(request.model).toBe("claude-opus-5-5");
    expect(request.output_config.format.type).toBe("json_schema");
    expect(request.messages[0].content[0]).toEqual({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: Buffer.from("poster").toString("base64"),
      },
    });
    // Told the mandir and the date, and to leave people out.
    expect(request.system).toContain("Shree Example Mandir, Leicester");
    expect(request.system).toContain(TODAY);
    expect(request.system).toContain("phone number");
  });

  it("sends a PDF as a document", async () => {
    const { create, client } = fakeClient({
      stop_reason: "end_turn",
      content: [{ type: "text", text: '{"events":[]}' }],
    });
    await readPoster(
      { data: Buffer.from("%PDF"), type: "application/pdf" },
      context,
      client,
    );
    expect(create.mock.calls[0][0].messages[0].content[0].type).toBe(
      "document",
    );
  });

  it("says so when Claude declines", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", content: [] });
    expect(await readPoster(picture, context, client)).toEqual({
      ok: false,
      error: "refused",
    });
  });

  it("says so when the request fails", async () => {
    const create = vi.fn().mockRejectedValue(new Error("network"));
    const client = { beta: { messages: { create } } } as never;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await readPoster(picture, context, client)).toEqual({
      ok: false,
      error: "failed",
    });
  });
});

describe("a poster read by machine", () => {
  it("keeps its mark through the queue", () => {
    const stored = {
      ...toEventInputs(answer, TODAY)[0],
      from: "whatsapp",
      link: "",
      read: "machine",
    };
    expect(posterFrom(stored)?.read).toBe("machine");
  });
});
