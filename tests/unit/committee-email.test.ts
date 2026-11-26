import { describe, expect, it } from "vitest";
import {
  checkStopCode,
  committeeEmailOn,
  stopCode,
  stopUrl,
} from "@/lib/committee-email";

const SECRET = "test-secret";
const U1 = "aaaaaaaa-0000-4000-8000-000000000001";
const U2 = "aaaaaaaa-0000-4000-8000-000000000002";
const M1 = "10000000-0000-4000-8000-000000000001";
const M2 = "20000000-0000-4000-8000-000000000002";

describe("the committee email's switch and stop links", () => {
  it("is off unless switched on", () => {
    expect(committeeEmailOn(undefined)).toBe(false);
    expect(committeeEmailOn("yes")).toBe(false);
    expect(committeeEmailOn("on")).toBe(true);
  });

  it("makes a stop code for one member and one mandir, that can't be reused", () => {
    const code = stopCode(U1, M1, SECRET)!;
    expect(checkStopCode(U1, M1, code, SECRET)).toBe(true);
    expect(checkStopCode(U2, M1, code, SECRET)).toBe(false);
    expect(checkStopCode(U1, M2, code, SECRET)).toBe(false);
    expect(checkStopCode(U1, M1, code, "another-secret")).toBe(false);
    expect(checkStopCode(U1, M1, `${code}x`, SECRET)).toBe(false);
    expect(checkStopCode("not-a-uuid", M1, code, SECRET)).toBe(false);
    expect(stopCode(U1, M1, undefined)).toBeNull();
    expect(stopUrl("https://toran.example", U1, M1, "abc")).toBe(
      `https://toran.example/committee-email/stop?u=${U1}&m=${M1}&c=abc`,
    );
  });
});
