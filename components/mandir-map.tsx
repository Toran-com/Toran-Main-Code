"use client";

import "leaflet/dist/leaflet.css";
import type {
  CircleMarker,
  LayerGroup,
  LeafletKeyboardEvent,
  Map as LeafletMap,
} from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useLocale, useT, type Locale } from "@/components/use-t";
import { enMandirs } from "@/lib/i18n/client/mandirs";
import { withLocale } from "@/lib/i18n/paths";

type Translate = ReturnType<typeof useT<keyof typeof enMandirs>>;
import { clusterApart, onTheMap } from "@/lib/map-clusters";

// The mandirs on a map of the UK, from the map positions worked out from
// their postcodes. Each mandir is a dot; dots close together merge into a
// numbered circle that splits apart as you zoom in. The background map is
// OpenStreetMap. Loaded only in the browser (see directory-list.tsx).

export type MapMandir = {
  slug: string;
  name: string;
  town: string;
  tradition: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Placed = MapMandir & { latitude: number; longitude: number };

const UK: [number, number] = [54.4, -2.6];

type Leaflet = typeof import("leaflet");
type Live = {
  L: Leaflet;
  map: LeafletMap;
  dots: LayerGroup;
  you: CircleMarker | null;
};

// The little card that opens on a dot, built from text (never HTML) so a
// mandir's name can't break the page.
function card(mandirs: Placed[], t: Translate, locale: Locale): HTMLElement {
  const box = document.createElement("div");
  box.className = "toran-popup";
  for (const m of mandirs) {
    const item = document.createElement("div");
    item.className = "toran-popup-item";
    const name = document.createElement("p");
    name.className = "toran-popup-name";
    name.textContent = m.name;
    const where = document.createElement("p");
    where.textContent = [m.town, m.tradition].filter(Boolean).join(" · ");
    const link = document.createElement("a");
    link.href = withLocale(`/mandirs/${m.slug}`, locale);
    link.textContent = t("map.seeWhatsOn");
    item.append(name, where, link);
    box.append(item);
  }
  return box;
}

export function MandirMap({ mandirs }: { mandirs: MapMandir[] }) {
  const t = useT(enMandirs);
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  const shownKey = useRef("");
  const [ready, setReady] = useState(false);
  const [finding, setFinding] = useState<
    "idle" | "finding" | "denied" | "failed"
  >("idle");
  const placed = onTheMap(mandirs);
  const missing = mandirs.length - placed.length;

  // Make the map once.
  useEffect(() => {
    let cancelled = false;
    let made: LeafletMap | null = null;
    void import("leaflet").then((L) => {
      if (cancelled || !box.current) return;
      made = L.map(box.current, { center: UK, zoom: 5, minZoom: 4 });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(made);
      made.attributionControl.setPrefix(
        '<a href="https://leafletjs.com">Leaflet</a>',
      );
      live.current = {
        L,
        map: made,
        dots: L.layerGroup().addTo(made),
        you: null,
      };
      setReady(true);
    });
    return () => {
      cancelled = true;
      made?.remove();
      live.current = null;
    };
  }, []);

  // Draw the dots, again at every zoom and whenever the search changes.
  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    const { L, map, dots } = now;
    const points = onTheMap(mandirs);
    // After zooming in from the keyboard, the dot or group to keep focus on.
    let refocus: string | null = null;
    const keepFocus = (el: HTMLElement | undefined, slugs: string[]) => {
      if (refocus && slugs.includes(refocus)) {
        refocus = null;
        el?.focus();
      }
    };

    const draw = () => {
      dots.clearLayers();
      // Far enough apart that no two circles touch (the biggest is 44px).
      const clusters = clusterApart(
        points,
        (m) => map.latLngToLayerPoint([m.latitude, m.longitude]),
        48,
      );
      for (const { items, x, y } of clusters) {
        if (items.length === 1) {
          const [m] = items;
          const dot = L.marker([m.latitude, m.longitude], {
            icon: L.divIcon({ className: "toran-dot", iconSize: [20, 20] }),
            title: m.name,
            keyboard: true,
            riseOnHover: true,
          }).bindPopup(() => card([m], t, locale));
          dot.on("add", () => {
            const el = dot.getElement();
            el?.setAttribute("role", "button");
            el?.setAttribute("aria-label", `${m.name}, ${m.town}`);
            keepFocus(el, [m.slug]);
          });
          dots.addLayer(dot);
          continue;
        }
        const size = items.length < 10 ? 32 : items.length < 50 ? 38 : 44;
        const label = t("map.cluster", { count: items.length });
        const group = L.marker(map.layerPointToLatLng([x, y]), {
          icon: L.divIcon({
            className: "toran-cluster",
            html: `<span>${items.length}</span>`,
            iconSize: [size, size],
          }),
          title: t("map.clusterTitle", { label }),
          keyboard: true,
        });
        group.on("add", () => {
          const el = group.getElement();
          el?.setAttribute("role", "button");
          el?.setAttribute("aria-label", t("map.clusterLabel", { label }));
          keepFocus(
            el,
            items.map((m) => m.slug),
          );
        });
        const open = () => {
          const bounds = L.latLngBounds(
            items.map((m) => [m.latitude, m.longitude] as [number, number]),
          );
          // Mandirs at the same address can't be split by zooming: list them.
          if (
            map.getZoom() >= 15 ||
            bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 30
          ) {
            L.popup()
              .setLatLng(bounds.getCenter())
              .setContent(card(items, t, locale))
              .openOn(map);
          } else {
            // By at least a step, so the group splits.
            const fit = map.getBoundsZoom(bounds, false, L.point(48, 48));
            map.setView(
              bounds.getCenter(),
              Math.min(15, Math.max(map.getZoom() + 1, fit)),
            );
          }
        };
        group.on("click", open);
        // Leaflet only answers Enter on markers with a card of their own.
        group.on("keypress", ({ originalEvent: key }: LeafletKeyboardEvent) => {
          if (key.key !== "Enter" && key.key !== " ") return;
          key.preventDefault();
          refocus = items[0].slug;
          open();
        });
        dots.addLayer(group);
      }
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
  }, [ready, mandirs, t, locale]);

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
          className="border-line-strong bg-surface text-ink hover:border-peacock/60 [&_svg]:text-peacock inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold transition duration-200 active:scale-95 disabled:opacity-60"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`size-4 ${finding === "finding" ? "animate-spin" : ""}`}
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
