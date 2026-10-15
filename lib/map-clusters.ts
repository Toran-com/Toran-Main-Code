// Groups map dots that would sit on top of each other into one numbered
// circle, by the screen square (in pixels) each falls in. Recalculated at
// every zoom, so groups split apart as you zoom in. Pure, so it's tested
// without a map.

export type Cluster<T> = { items: T[]; x: number; y: number };

export function clusterPoints<T>(
  items: readonly T[],
  position: (item: T) => { x: number; y: number },
  cell = 44,
): Cluster<T>[] {
  const cells = new Map<string, { items: T[]; sx: number; sy: number }>();
  for (const item of items) {
    const { x, y } = position(item);
    const key = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
    const group = cells.get(key) ?? { items: [], sx: 0, sy: 0 };
    group.items.push(item);
    group.sx += x;
    group.sy += y;
    cells.set(key, group);
  }
  return [...cells.values()].map(({ items: group, sx, sy }) => ({
    items: group,
    x: sx / group.length,
    y: sy / group.length,
  }));
}

// The mandirs that can go on the map (those with a map position).
export function onTheMap<
  T extends { latitude: number | null; longitude: number | null },
>(mandirs: readonly T[]): (T & { latitude: number; longitude: number })[] {
  return mandirs.filter(
    (m): m is T & { latitude: number; longitude: number } =>
      m.latitude !== null && m.longitude !== null,
  );
}
