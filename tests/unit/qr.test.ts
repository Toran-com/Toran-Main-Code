import { describe, expect, it } from "vitest";
import { qrPath } from "@/lib/qr";

describe("qrPath", () => {
  it("draws a square code made of unit squares", () => {
    const { size, d } = qrPath("https://example.org/mandirs/some-mandir");
    // QR codes are 21, 25, 29… modules across.
    expect((size - 21) % 4).toBe(0);
    expect(d).toMatch(/^(M\d+ \d+h1v1h-1z)+$/);
  });

  it("has the three corner finder patterns", () => {
    const { size, d } = qrPath("https://example.org");
    for (const [col, row] of [
      [0, 0],
      [size - 1, 0],
      [0, size - 1],
    ]) {
      expect(d).toContain(`M${col} ${row}h1v1h-1z`);
    }
  });

  it("gives the same code for the same address", () => {
    expect(qrPath("https://example.org").d).toBe(
      qrPath("https://example.org").d,
    );
  });
});
