// Grouping map circles that would sit on top of each other into one
// numbered circle, recalculated at every zoom so groups split apart as you
// zoom in. Pure, so it's tested without a map.

export type Cluster<T> = { items: T[]; x: number; y: number };

// The mandirs that can go on the map (those with a map position).
export function onTheMap<
  T extends { latitude: number | null; longitude: number | null },
>(mandirs: readonly T[]): (T & { latitude: number; longitude: number })[] {
  return mandirs.filter(
    (m): m is T & { latitude: number; longitude: number } =>
      m.latitude !== null && m.longitude !== null,
  );
}

// Groups map circles that would touch: each joins the first group whose
// circle is closer than "apart" pixels, else starts its own, which stays
// where it is. So no two circles shown ever overlap, however big. Items
// go in the order given (put the most important first).
export function clusterApart<T>(
  items: readonly T[],
  position: (item: T) => { x: number; y: number },
  apart: number,
): Cluster<T>[] {
  const groups: Cluster<T>[] = [];
  for (const item of items) {
    const { x, y } = position(item);
    const near = groups.find((g) => Math.hypot(g.x - x, g.y - y) < apart);
    if (near) near.items.push(item);
    else groups.push({ items: [item], x, y });
  }
  return groups;
}
