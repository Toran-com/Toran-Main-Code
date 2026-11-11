"use client";

import type {
  CircleMarker,
  LayerGroup,
  Map as LeafletMap,
  Marker,
} from "leaflet";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  FRAME_PADDING,
  lamp,
  makeUkMap,
  mapControls,
  nameOnHover,
} from "@/components/uk-map";
import { useT } from "@/components/use-t";
import type { Position } from "@/lib/geo";
import { enMandirs } from "@/lib/i18n/client/mandirs";
import { enMap } from "@/lib/i18n/client/map";
import { clusterApart, onTheMap } from "@/lib/map-clusters";

// The map half of the mandir finder (components/directory-list.tsx), on
// the street map the three maps share (uk-map.ts). Each mandir is a pin;
// pins close together become a circle with how many, which zooms in when
// tapped and splits apart. Tapping a pin chooses that mandir: its pin
// turns gold and the finder shows its card over the map (passed in as
// children). The finder owns what's chosen and where to go; the map tells
// it what part of the UK it shows, so the list can follow. Loaded only in
// the browser.

export type MapMandir = {
  slug: string;
  name: string;
  town: string;
  latitude: number | null;
  longitude: number | null;
};

// What part of the UK the map shows: its edges and its middle.
export type MapArea = {
  south: number;
  west: number;
  north: number;
  east: number;
  middle: Position;
};

// A place to move the map to; "key" makes asking twice move it twice.
export type MapGoTo = { at: Position; zoom: number; key: number };

type Leaflet = typeof import("leaflet");
type Live = {
  L: Leaflet;
  map: LeafletMap;
  pins: LayerGroup;
  you: CircleMarker | null;
  place: CircleMarker | null;
};

// Room left free at the bottom of the map for the chosen mandir's card,
// so its pin is never under it.
const CARD_ROOM = 250;

export function MandirMap({
  mandirs,
  chosen,
  pointed,
  onChoose,
  onArea,
  goTo,
  you,
  place,
  children,
  className = "",
}: {
  mandirs: MapMandir[];
  chosen: string[];
  pointed: string | null;
  onChoose: (slugs: string[], byKeyboard: boolean) => void;
  onArea: (area: MapArea) => void;
  goTo: MapGoTo | null;
  you: Position | null;
  place: Position | null;
  children?: ReactNode;
  className?: string;
}) {
  const t = useT(enMandirs);
  const tm = useT(enMap);
  const box = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  // Each mandir's mark as last drawn: its own pin, or the circle it's in.
  const marks = useRef(new Map<string, Marker>());
  const shownKey = useRef("");
  const [ready, setReady] = useState(false);
  // Inside the map, so the card goes full screen with it and stays under
  // the page's header and tab bar.
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);

  // The latest of what the finder passed in, for the map's own events.
  const latest = useRef({ chosen, pointed, onChoose, onArea });
  useEffect(() => {
    latest.current = { chosen, pointed, onChoose, onArea };
  });

  // The chosen mandir's mark gold, and the one pointed at in the list
  // lifted. Marks are redrawn at every zoom, so this runs then too.
  const mark = useRef(() => {
    const { chosen: picked, pointed: over } = latest.current;
    for (const [slug, m] of marks.current) {
      const el = m.getElement();
      el?.classList.toggle("toran-chosen", picked.includes(slug));
      el?.classList.toggle("toran-pointed", over === slug);
    }
  });
  useEffect(() => mark.current(), [chosen, pointed]);

  // Make the map once (again only if the page's language changes).
  useEffect(() => {
    let cancelled = false;
    let made: LeafletMap | null = null;
    let unControl = () => {};
    void import("leaflet").then((L) => {
      if (cancelled || !box.current) return;
      const map = makeUkMap(L, box.current);
      made = map;
      unControl = mapControls(L, map, box.current, {
        expand: tm("mapUi.expand"),
        close: tm("mapUi.close"),
        wholeUk: tm("mapUi.wholeUk"),
        scrollHint: tm(
          /Mac|iPhone|iPad/.test(navigator.platform)
            ? "mapUi.scrollHintMac"
            : "mapUi.scrollHint",
        ),
        touchHint: tm("mapUi.touchHint"),
      });
      map.on("moveend", () => {
        const b = map.getBounds();
        const c = map.getCenter();
        latest.current.onArea({
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
          middle: { latitude: c.lat, longitude: c.lng },
        });
      });
      const layer = L.DomUtil.create("div", "toran-map-overlay", box.current);
      // Taps and scrolls on the card are the card's, not the map's.
      L.DomEvent.disableClickPropagation(layer);
      L.DomEvent.disableScrollPropagation(layer);
      live.current = {
        L,
        map,
        pins: L.layerGroup().addTo(map),
        you: null,
        place: null,
      };
      setOverlay(layer);
      setReady(true);
    });
    return () => {
      cancelled = true;
      unControl();
      made?.remove();
      live.current = null;
      setOverlay(null);
    };
  }, [tm]);

  // Draw the pins, again at every zoom and whenever the search changes.
  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    const { L, map, pins } = now;
    const points = onTheMap(mandirs);
    // After a circle is opened from the keyboard, the mark to keep focus on.
    let refocus: string | null = null;
    const keepFocus = (el: HTMLElement | undefined, slugs: string[]) => {
      if (refocus && slugs.includes(refocus)) {
        refocus = null;
        el?.focus();
      }
    };
    // A mark is a button: a tap or click, or Enter or Space when focused.
    // (Leaflet only does Enter for marks with its own popups.)
    const onPress = (mark: Marker, act: (byKeyboard: boolean) => void) => {
      mark.on("click", () => act(false));
      mark.on("keypress", (e) => {
        const key = (e.originalEvent as KeyboardEvent).key;
        if (key !== "Enter" && key !== " ") return;
        e.originalEvent.preventDefault();
        act(true);
      });
    };

    // The pins drop in the first time they're drawn, not at every zoom.
    let first = true;
    const draw = () => {
      pins.clearLayers();
      marks.current.clear();
      // Far enough apart that no two marks touch.
      const clusters = clusterApart(
        points,
        (m) => map.latLngToLayerPoint([m.latitude, m.longitude]),
        46,
      );
      clusters.forEach(({ items, x, y }, order) => {
        const light = first;
        if (items.length === 1) {
          const [m] = items;
          const pin = L.marker([m.latitude, m.longitude], {
            icon: lamp(L, { kind: "toran-dot", light, order }),
            keyboard: true,
            riseOnHover: true,
          });
          onPress(pin, (byKeyboard) => {
            latest.current.onChoose([m.slug], byKeyboard);
            map.panInside([m.latitude, m.longitude], {
              paddingTopLeft: [60, 60],
              paddingBottomRight: [20, CARD_ROOM],
            });
          });
          nameOnHover(pin, m.name);
          pin.on("add", () => {
            const el = pin.getElement();
            el?.setAttribute("role", "button");
            el?.setAttribute("aria-label", `${m.name}, ${m.town}`);
            keepFocus(el, [m.slug]);
          });
          marks.current.set(m.slug, pin);
          pins.addLayer(pin);
          return;
        }
        const size = items.length < 10 ? 1 : items.length < 50 ? 1.12 : 1.25;
        const label = t("map.cluster", { count: items.length });
        const at = map.layerPointToLatLng([x, y]);
        const bounds = L.latLngBounds(
          items.map((m) => [m.latitude, m.longitude] as [number, number]),
        );
        // Mandirs at the same address can't be split by zooming: choose
        // them all, and the card lists them.
        const splits =
          map.getZoom() < 16 &&
          bounds.getNorthEast().distanceTo(bounds.getSouthWest()) >= 30;
        const group = L.marker(at, {
          icon: lamp(L, {
            kind: "toran-cluster",
            count: items.length,
            size,
            light,
            order,
          }),
          keyboard: true,
        });
        onPress(group, (byKeyboard) => {
          if (!splits) {
            latest.current.onChoose(
              items.map((m) => m.slug),
              byKeyboard,
            );
            return;
          }
          refocus = items[0].slug;
          // By at least a step, so the group splits.
          const fit = map.getBoundsZoom(bounds, false, L.point(48, 48));
          map.setView(
            bounds.getCenter(),
            Math.min(16, Math.max(map.getZoom() + 1, fit)),
          );
        });
        nameOnHover(group, label);
        group.on("add", () => {
          const el = group.getElement();
          el?.setAttribute("role", "button");
          el?.setAttribute("aria-label", t("map.clusterLabel", { label }));
          keepFocus(
            el,
            items.map((m) => m.slug),
          );
        });
        for (const m of items) marks.current.set(m.slug, group);
        pins.addLayer(group);
      });
      first = false;
      mark.current();
    };

    // Frame the mandirs shown: all of them, or the ones a search found.
    const key = points.map((m) => m.slug).join(",");
    if (key !== shownKey.current) {
      shownKey.current = key;
      if (points.length === 1) {
        map.setView([points[0].latitude, points[0].longitude], 14);
      } else if (points.length > 1) {
        map.fitBounds(
          L.latLngBounds(
            points.map((m) => [m.latitude, m.longitude] as [number, number]),
          ),
          { ...FRAME_PADDING, maxZoom: 13 },
        );
      }
    }
    draw();
    map.on("zoomend", draw);
    return () => {
      map.off("zoomend", draw);
    };
  }, [ready, mandirs, t]);

  // Go where the finder asks: a chosen mandir, a postcode, or "Near me".
  useEffect(() => {
    const now = live.current;
    if (!ready || !now || !goTo) return;
    now.map.flyTo([goTo.at.latitude, goTo.at.longitude], goTo.zoom, {
      duration: 0.8,
    });
  }, [ready, goTo]);

  // Where the visitor is, after "Near me", and the postcode searched for.
  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    now.you?.remove();
    now.you = you
      ? now.L.circleMarker([you.latitude, you.longitude], {
          radius: 9,
          className: "toran-you",
        })
          .bindTooltip(t("map.youAreHere"))
          .addTo(now.map)
      : null;
  }, [ready, you, t]);
  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    now.place?.remove();
    now.place = place
      ? now.L.circleMarker([place.latitude, place.longitude], {
          radius: 10,
          className: "toran-searched",
          interactive: false,
        }).addTo(now.map)
      : null;
  }, [ready, place]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={box}
        role="region"
        aria-label={t("map.label")}
        className="toran-map bg-sunk h-full w-full"
      />
      {overlay && children ? createPortal(children, overlay) : null}
    </div>
  );
}
