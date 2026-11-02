import { describe, expect, it } from "vitest";
import {
  isJpeg,
  newPhotoName,
  photoSrcSet,
  photoUrl,
} from "@/lib/mandir-photo";

const PATH = "10000000-0000-0000-0000-000000000001/abc123def456";
const BASE = "https://db.example.supabase.co/";

describe("photoUrl", () => {
  it("is the public address of one size", () => {
    expect(photoUrl(PATH, 640, BASE)).toBe(
      "https://db.example.supabase.co/storage/v1/object/public/mandir-photos/10000000-0000-0000-0000-000000000001/abc123def456-640.jpg",
    );
  });
  it("is nothing without a database", () => {
    expect(photoUrl(PATH, 640, "")).toBeNull();
    expect(photoSrcSet(PATH, "")).toBeNull();
  });
  it("lists both sizes for srcset", () => {
    expect(photoSrcSet(PATH, BASE)).toMatch(
      /-640\.jpg 640w, .*-1200\.jpg 1200w$/,
    );
  });
});

describe("isJpeg", () => {
  it("knows a JPEG by its first bytes", () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isJpeg(new Uint8Array([]))).toBe(false);
  });
});

describe("newPhotoName", () => {
  it("is fresh each time and fits the database's pattern", () => {
    const a = newPhotoName();
    expect(a).toMatch(/^[a-z0-9]{6,40}$/);
    expect(newPhotoName()).not.toBe(a);
  });
});
