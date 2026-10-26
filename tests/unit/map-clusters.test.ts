import { describe, expect, it } from "vitest";
import { clusterApart, onTheMap } from "@/lib/map-clusters";

const at = (p: { x: number; y: number }) => p;

describe("onTheMap", () => {
  it("keeps only mandirs with a map position", () => {
    const mandirs = [
      { slug: "a", latitude: 52.6, longitude: -1.1 },
      { slug: "b", latitude: null, longitude: null },
      { slug: "c", latitude: 51.5, longitude: null },
      { slug: "d", latitude: 0, longitude: 0 },
    ];
    expect(onTheMap(mandirs).map((m) => m.slug)).toEqual(["a", "d"]);
  });
});

describe("clusterApart", () => {
  it("keeps circles far enough apart as they are", () => {
    const groups = clusterApart(
      [
        { x: 0, y: 0 },
        { x: 60, y: 0 },
      ],
      at,
      56,
    );
    expect(groups.map((g) => g.items.length)).toEqual([1, 1]);
  });

  it("puts circles that would touch in the first one's group, where it is", () => {
    const groups = clusterApart(
      [
        { x: 0, y: 0 },
        { x: 30, y: 30 },
        { x: 70, y: 0 },
        { x: 500, y: 500 },
      ],
      at,
      56,
    );
    expect(groups.map((g) => [g.items.length, g.x, g.y])).toEqual([
      [2, 0, 0],
      [1, 70, 0],
      [1, 500, 500],
    ]);
  });
});
