import { describe, expect, it } from "vitest";
import { demoEvents, demoRota, demoRotaMessage } from "@/lib/demo";

describe("demo content", () => {
  it("has unique event ids", () => {
    const ids = demoEvents.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("writes the rota message in the same shape as a real rota", () => {
    const message = demoRotaMessage();
    expect(message.startsWith("Seva for Sharad Purnima garba")).toBe(true);
    for (const role of demoRota) expect(message).toContain(`*${role.name}*`);
    expect(message).toContain("(DBS check needed)");
    expect(message).toContain("• Saturday, 7pm–8:30pm: 3 people");
    expect(message.endsWith("Reply here if you can help. 🙏")).toBe(true);
  });
});
