import { describe, expect, it } from "vitest";
import { cleanNotice, noticeUntil } from "@/lib/notices";

const TODAY = "2026-11-24";

describe("noticeUntil", () => {
  it("works out the last day from the choice", () => {
    expect(noticeUntil("today", "", TODAY)).toBe("2026-11-24");
    expect(noticeUntil("tomorrow", "", TODAY)).toBe("2026-11-25");
    expect(noticeUntil("week", "", TODAY)).toBe("2026-11-30");
    expect(noticeUntil("date", "2026-12-10", TODAY)).toBe("2026-12-10");
  });

  it("refuses the past, more than a month ahead, and nonsense", () => {
    expect(noticeUntil("date", "2026-11-23", TODAY)).toBeNull();
    expect(noticeUntil("date", "2026-12-26", TODAY)).toBeNull();
    expect(noticeUntil("date", "2026-12-25", TODAY)).toBe("2026-12-25");
    expect(noticeUntil("date", "soon", TODAY)).toBeNull();
    expect(noticeUntil("forever", "", TODAY)).toBeNull();
  });
});

describe("cleanNotice", () => {
  it("tidies spaces and keeps 3 to 200 characters", () => {
    expect(cleanNotice("  Closed   today\n because of snow ")).toBe(
      "Closed today because of snow",
    );
    expect(cleanNotice("ok")).toBeNull();
    expect(cleanNotice("x".repeat(200))).toHaveLength(200);
    expect(cleanNotice("x".repeat(201))).toBeNull();
  });
});
