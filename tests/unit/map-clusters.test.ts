import { describe, expect, it } from "vitest";
import { clusterApart, clusterPoints, onTheMap } from "@/lib/map-clusters";

const at = (p: { x: number; y: number }) => p;

describe("clusterPoints", () => {
  it("keeps dots far apart as separate dots", () => {
    const clusters = clusterPoints(
      [
        { x: 10, y: 10 },
        { x: 200, y: 10 },
        { x: 10, y: 200 },
      ],
      at,
    );
    expect(clusters).toHaveLength(3);
    expect(clusters.every((c) => c.items.length === 1)).toBe(true);
  });

  it("merges dots in the same square into one, centred between them", () => {
    const clusters = clusterPoints(
      [
        { x: 2, y: 4 },
        { x: 10, y: 20 },
        { x: 300, y: 300 },
      ],
      at,
    );
    expect(clusters).toHaveLength(2);
    const group = clusters.find((c) => c.items.length === 2)!;
    expect(group).toMatchObject({ x: 6, y: 12 });
  });

  it("uses the square size given", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
    ];
    expect(clusterPoints(points, at)).toHaveLength(2);
    expect(clusterPoints(points, at, 100)).toHaveLength(1);
  });

  it("handles negative positions", () => {
    expect(
      clusterPoints(
        [
          { x: -5, y: -5 },
          { x: 5, y: 5 },
        ],
        at,
      ),
    ).toHaveLength(2);
  });

  it("returns nothing for no dots", () => {
    expect(clusterPoints([], at)).toEqual([]);
  });
});

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
