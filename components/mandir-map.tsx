"use client";

import type { CircleMarker, LayerGroup, Map as LeafletMap } from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapKey } from "@/components/map-key";
import {
  cardFit,
  cityLabels,
  directionsLink,
  keepLitWhileOpen,
  lamp,
  makeUkMap,
  mapControls,
  nameOnHover,
} from "@/components/uk-map";
import { useLocale, useT, type Locale } from "@/components/use-t";
import { distanceMiles, type Position } from "@/lib/geo";
import { enMandirs } from "@/lib/i18n/client/mandirs";
import { enMap } from "@/lib/i18n/client/map";
import { withLocale } from "@/lib/i18n/paths";
import { clusterApart, onTheMap } from "@/lib/map-clusters";

// The mandirs on a map of the UK, from the map positions worked out from
// their postcodes. Each mandir is a small flame; flames close together
// merge into a lamp with a number, which opens a list of them in one tap
// (with "Zoom in here"), and splits apart as you zoom in. Each card has
// the way to the mandir's page and directions. "Near me" also lists the
// nearest mandirs under the map. The map itself is shared with the other
// maps (uk-map.ts). Loaded only in the browser (see directory-list.tsx).

export type MapMandir = {
  slug: string;
  name: string;
  town: string;
  tradition: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Placed = MapMandir & { latitude: number; longitude: number };

type Translate = ReturnType<typeof useT<keyof typeof enMandirs>>;
type MapTranslate = ReturnType<typeof useT<keyof typeof enMap>>;

type Leaflet = typeof import("leaflet");
type Live = {
  L: Leaflet;
  map: LeafletMap;
  dots: LayerGroup;
  places: ReturnType<typeof cityLabels>;
  you: CircleMarker | null;
};

function away(miles: number, tm: MapTranslate): string {
  if (miles < 1) return tm("mapUi.under");
  const rounded = Math.round(miles);
  return rounded === 1
    ? tm("mapUi.miles.one")
    : tm("mapUi.miles.other", { miles: rounded });
}

// The card that opens on a light, built from text (never HTML) so a
// mandir's name can't break the page: each mandir's name, town and
// tradition (and how far, once "Near me" has been used), its page and
// directions. Nearest first when we know where the visitor is. "zoom", for
// a group that zooming can split, puts "Zoom in here" first.
function card(
  mandirs: Placed[],
  t: Translate,
  tm: MapTranslate,
  locale: Locale,
  you: Position | null,
  zoom?: () => void,
): HTMLElement {
  const box = document.createElement("div");
  box.className = "toran-popup";
  if (zoom) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toran-popup-zoom";
    button.textContent = tm("mapUi.zoomHere");
    button.addEventListener("click", zoom);
    box.append(button);
  }
  const ordered = you
    ? [...mandirs].sort((a, b) => distanceMiles(you, a) - distanceMiles(you, b))
    : mandirs;
  for (const m of ordered) {
    const item = document.createElement("div");
    item.className = "toran-popup-item";
    const name = document.createElement("p");
    name.className = "toran-popup-name";
    name.textContent = m.name;
    const where = document.createElement("p");
    where.className = "toran-popup-meta";
    where.textContent = [
      m.town,
      m.tradition,
      you ? away(distanceMiles(you, m), tm) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const actions = document.createElement("p");
    actions.className = "toran-popup-actions";
    const link = document.createElement("a");
    link.href = withLocale(`/mandirs/${m.slug}`, locale);
    link.className = "toran-popup-main";
    link.textContent = t("map.seeWhatsOn");
    actions.append(
      link,
      directionsLink(
        m.latitude,
        m.longitude,
        tm("mapUi.directions"),
        tm("mapUi.directionsLabel", { name: m.name }),
      ),
    );
    item.append(name, where, actions);
    box.append(item);
  }
  return box;
}

export function MandirMap({ mandirs }: { mandirs: MapMandir[] }) {
  const t = useT(enMandirs);
  const tm = useT(enMap);
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  const shownKey = useRef("");
  const [ready, setReady] = useState(false);
  const [you, setYou] = useState<Position | null>(null);
  const [finding, setFinding] = useState<
    "idle" | "finding" | "denied" | "failed"
  >("idle");
  const placed = onTheMap(mandirs);
  const missing = mandirs.length - placed.length;

  // Make the map once (again only if the page's language changes).
  useEffect(() => {
    let cancelled = false;
    let made: LeafletMap | null = null;
    let unControl = () => {};
    void import("leaflet").then((L) => {
      if (cancelled || !box.current) return;
      made = makeUkMap(L, box.current);
      unControl = mapControls(L, made, box.current, {
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
      live.current = {
        L,
        map: made,
        dots: L.layerGroup().addTo(made),
        places: cityLabels(L, made),
        you: null,
      };
      setReady(true);
    });
    return () => {
      cancelled = true;
      unControl();
      made?.remove();
      live.current = null;
    };
  }, [tm]);

  // Draw the lights, again at every zoom and whenever the search changes.
  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    const { L, map, dots, places } = now;
    const points = onTheMap(mandirs);
    // After "Zoom in here" from the keyboard, the light to keep focus on.
    let refocus: string | null = null;
    const keepFocus = (el: HTMLElement | undefined, slugs: string[]) => {
      if (refocus && slugs.includes(refocus)) {
        refocus = null;
        el?.focus();
      }
    };

    // The lights come on the first time they're drawn, not at every zoom.
    let first = true;
    const draw = () => {
      dots.clearLayers();
      const lights: [number, number][] = [];
      // Far enough apart that no two lights touch (the biggest is 53px wide).
      const clusters = clusterApart(
        points,
        (m) => map.latLngToLayerPoint([m.latitude, m.longitude]),
        52,
      );
      clusters.forEach(({ items, x, y }, order) => {
        const light = first;
        if (items.length === 1) {
          const [m] = items;
          lights.push([m.latitude, m.longitude]);
          const dot = L.marker([m.latitude, m.longitude], {
            icon: lamp(L, { kind: "toran-dot", light, order }),
            keyboard: true,
            riseOnHover: true,
          }).bindPopup(() => card([m], t, tm, locale, you), cardFit(map));
          keepLitWhileOpen(dot);
          nameOnHover(dot, m.name);
          dot.on("add", () => {
            const el = dot.getElement();
            el?.setAttribute("role", "button");
            el?.setAttribute("aria-label", `${m.name}, ${m.town}`);
            keepFocus(el, [m.slug]);
          });
          dots.addLayer(dot);
          return;
        }
        const size = items.length < 10 ? 1 : items.length < 50 ? 1.12 : 1.25;
        const label = t("map.cluster", { count: items.length });
        const at = map.layerPointToLatLng([x, y]);
        lights.push([at.lat, at.lng]);
        const bounds = L.latLngBounds(
          items.map((m) => [m.latitude, m.longitude] as [number, number]),
        );
        // Mandirs at the same address can't be split by zooming.
        const splits =
          map.getZoom() < 15 &&
          bounds.getNorthEast().distanceTo(bounds.getSouthWest()) >= 30;
        const zoom = () => {
          refocus = items[0].slug;
          map.closePopup();
          // By at least a step, so the group splits.
          const fit = map.getBoundsZoom(bounds, false, L.point(48, 48));
          map.setView(
            bounds.getCenter(),
            Math.min(15, Math.max(map.getZoom() + 1, fit)),
          );
        };
        const group = L.marker(at, {
          icon: lamp(L, {
            kind: "toran-cluster",
            count: items.length,
            size,
            light,
            order,
          }),
          keyboard: true,
        }).bindPopup(
          () => card(items, t, tm, locale, you, splits ? zoom : undefined),
          cardFit(map),
        );
        keepLitWhileOpen(group);
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
        dots.addLayer(group);
      });
      first = false;
      // City names make way for the lights.
      places.avoid(lights);
    };

    // Frame the mandirs shown: all of them, or the ones a search found.
    const key = points.map((m) => m.slug).join(",");
    if (key !== shownKey.current) {
      shownKey.current = key;
      if (points.length === 1) {
        map.setView([points[0].latitude, points[0].longitude], 13);
      } else if (points.length > 1) {
        map.fitBounds(
          L.latLngBounds(
            points.map((m) => [m.latitude, m.longitude] as [number, number]),
          ),
          { padding: [32, 32], maxZoom: 13 },
        );
      }
    }
    draw();
    map.on("zoomend", draw);
    return () => {
      map.off("zoomend", draw);
    };
  }, [ready, mandirs, t, tm, locale, you]);

  // The nearest mandirs once we know where the visitor is.
  const nearest = useMemo(
    () =>
      you
        ? placed
            .map((m) => ({ m, miles: distanceMiles(you, m) }))
            .sort((a, b) => a.miles - b.miles)
            .slice(0, 5)
        : [],
    [you, placed],
  );

  // "Near me": centre on where the visitor is. The browser asks first, and
  // Toran never sends or keeps the position.
  function nearMe() {
    if (!("geolocation" in navigator)) {
      setFinding("failed");
      return;
    }
    setFinding("finding");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const now = live.current;
        if (!now) return;
        const at: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        now.you?.remove();
        now.you = now.L.circleMarker(at, {
          radius: 9,
          className: "toran-you",
        })
          .bindTooltip(t("map.youAreHere"))
          .addTo(now.map);
        now.map.setView(at, 11);
        setYou({ latitude: at[0], longitude: at[1] });
        setFinding("idle");
      },
      (error) =>
        setFinding(
          error.code === error.PERMISSION_DENIED ? "denied" : "failed",
        ),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={nearMe}
          disabled={!ready || finding === "finding"}
          className="border-line-strong bg-surface text-ink hover:border-peacock/60 [&_svg]:text-peacock inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-5 py-2 text-lg font-semibold transition duration-200 active:scale-95 disabled:opacity-60"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`size-5 ${finding === "finding" ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          {finding === "finding" ? t("whatsOn.finding") : t("whatsOn.nearMe")}
        </button>
        <p className="text-muted text-base" aria-live="polite">
          {finding === "denied" && t("map.denied")}
          {finding === "failed" && t("map.failed")}
        </p>
      </div>
      <div
        ref={box}
        role="region"
        aria-label={t("map.label")}
        className="toran-map border-line bg-sunk shadow-card h-[60vh] min-h-80 w-full overflow-hidden rounded-2xl border"
      />
      <MapKey many="mandirs" />
      {nearest.length > 0 && (
        <section
          aria-labelledby="nearest-mandirs"
          className="border-line bg-surface shadow-card mt-2 flex flex-col gap-3 rounded-2xl border p-5"
        >
          <h2
            id="nearest-mandirs"
            className="font-display text-2xl leading-tight"
          >
            {tm("mapUi.nearest")}
          </h2>
          <ol className="flex flex-col">
            {nearest.map(({ m, miles }) => (
              <li
                key={m.slug}
                className="border-line flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t py-3 first:border-t-0 first:pt-0"
              >
                <Link
                  href={withLocale(`/mandirs/${m.slug}`, locale)}
                  className="text-peacock text-lg font-semibold"
                >
                  {m.name}
                </Link>
                <span className="text-muted text-base">
                  {m.town} · {away(miles, tm)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {missing > 0 && (
        <p className="text-muted text-base">
          {missing === mandirs.length
            ? t("map.noneOnMap")
            : t(missing === 1 ? "map.missing.one" : "map.missing.other", {
                count: missing,
              })}
        </p>
      )}
    </div>
  );
}
