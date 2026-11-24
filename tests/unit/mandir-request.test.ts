import { describe, expect, it } from "vitest";
import { checkRequest, requestEmail } from "@/lib/mandir-request";

const OFFERED = ["Satyanarayan katha", "Hall hire"];
const TODAY = "2026-11-24";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const good = {
  what: "Hall hire",
  date: "2026-12-12",
  name: "  Asha   Patel ",
  email: "Asha@Example.com",
  phone: "",
  message: "About 80 guests, for a birthday.",
};

describe("checkRequest", () => {
  it("accepts a request, tidying the name and email", () => {
    const r = checkRequest(form(good), OFFERED, TODAY);
    expect(r).toEqual({
      ok: true,
      request: {
        what: "Hall hire",
        date: "2026-12-12",
        name: "Asha Patel",
        email: "asha@example.com",
        phone: null,
        message: "About 80 guests, for a birthday.",
      },
    });
  });

  it("needs one of the things the committee offers", () => {
    expect(
      checkRequest(form({ ...good, what: "Wedding" }), OFFERED, TODAY),
    ).toEqual({ ok: false, error: "what" });
  });

  it("takes no date, or one from today on", () => {
    expect(checkRequest(form({ ...good, date: "" }), OFFERED, TODAY).ok).toBe(
      true,
    );
    expect(
      checkRequest(form({ ...good, date: TODAY }), OFFERED, TODAY).ok,
    ).toBe(true);
    expect(
      checkRequest(form({ ...good, date: "2026-11-23" }), OFFERED, TODAY),
    ).toEqual({ ok: false, error: "date" });
    expect(
      checkRequest(form({ ...good, date: "soon" }), OFFERED, TODAY),
    ).toEqual({ ok: false, error: "date" });
  });

  it("needs a name and a way to reply", () => {
    expect(checkRequest(form({ ...good, name: "A" }), OFFERED, TODAY)).toEqual({
      ok: false,
      error: "name",
    });
    expect(
      checkRequest(form({ ...good, email: "", phone: "" }), OFFERED, TODAY),
    ).toEqual({ ok: false, error: "contact" });
    expect(
      checkRequest(
        form({ ...good, email: "", phone: "+44 (0)20 8000 0000" }),
        OFFERED,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it("turns away an email or phone number that can't be right", () => {
    expect(
      checkRequest(form({ ...good, email: "asha" }), OFFERED, TODAY),
    ).toEqual({ ok: false, error: "email" });
    expect(
      checkRequest(form({ ...good, phone: "call me" }), OFFERED, TODAY),
    ).toEqual({ ok: false, error: "phone" });
  });

  it("keeps the message short", () => {
    expect(
      checkRequest(form({ ...good, message: "x".repeat(601) }), OFFERED, TODAY),
    ).toEqual({ ok: false, error: "message" });
  });
});

describe("requestEmail", () => {
  const request = {
    what: "Hall hire",
    date: "2026-12-12",
    name: "Asha <Patel>",
    email: "asha@example.com",
    phone: null,
    message: "About 80 guests.",
  };

  it("tells the committee what, when and who, and replies go to the family", () => {
    const e = requestEmail(
      { name: "Shree Mandir" },
      request,
      "Saturday 12 December 2026",
    );
    expect(e.subject).toBe(
      "Request: Hall hire, Saturday 12 December 2026 (Shree Mandir)",
    );
    expect(e.replyTo).toBe("asha@example.com");
    expect(e.text).toContain("From: Asha <Patel>");
    expect(e.text).toContain("Reply to this email");
    expect(e.html).toContain("Asha &lt;Patel&gt;");
    expect(e.html).not.toContain("<Patel>");
  });

  it("asks the committee to call when there's only a phone number", () => {
    const e = requestEmail(
      { name: "Shree Mandir" },
      { ...request, email: null, phone: "07700 900000" },
      null,
    );
    expect(e.replyTo).toBeUndefined();
    expect(e.subject).toBe("Request: Hall hire (Shree Mandir)");
    expect(e.text).toContain("Phone: 07700 900000");
    expect(e.text).toContain("Please call or message them");
  });
});
