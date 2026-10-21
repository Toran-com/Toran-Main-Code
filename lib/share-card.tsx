import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { dateTileParts } from "@/lib/format";
import { site } from "@/lib/site";

// The picture WhatsApp, Facebook and others show under a shared link, in
// the site's look: deep peacock under the toran, a faint gold rangoli, the
// headline serif, and for an event its date as a tile from a panchang.

export const cardSize = { width: 1200, height: 630 };

const colour = {
  night: "#0a3b3a",
  cream: "#faf3e6",
  mist: "#cfe3df",
  accent: "#ffc95c",
  ink: "#1b1a2c",
  muted: "#5d5a6e",
  kumkum: "#c21e3a",
};

// Fonts and line art are read from the repository once per server.
let assets: Promise<{
  fonts: { name: string; data: Buffer; weight: 400 | 600 | 700 }[];
  toran: string;
  rangoli: string;
}> | null = null;

function loadAssets() {
  assets ??= (async () => {
    const file = (...parts: string[]) =>
      readFile(path.join(process.cwd(), ...parts));
    const [serif, sans600, sans700, toranSvg, rangoliSvg] = await Promise.all([
      file("assets", "fonts", "instrument-serif-latin-400-normal.woff"),
      file("assets", "fonts", "figtree-latin-600-normal.woff"),
      file("assets", "fonts", "figtree-latin-700-normal.woff"),
      file("public", "art", "toran-night.svg"),
      file("public", "art", "rangoli-night.svg"),
    ]);
    // The toran is one 64px drop; repeat it across the card as a pattern.
    const drop = toranSvg
      .toString("utf8")
      .replace(/^[\s\S]*?<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "");
    const strip = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="80" viewBox="0 0 960 64"><defs><pattern id="d" width="64" height="64" patternUnits="userSpaceOnUse">${drop}</pattern></defs><rect width="960" height="64" fill="url(#d)"/></svg>`;
    const uri = (svg: string) =>
      `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    return {
      fonts: [
        { name: "Instrument Serif", data: serif, weight: 400 },
        { name: "Figtree", data: sans600, weight: 600 },
        { name: "Figtree", data: sans700, weight: 700 },
      ],
      toran: uri(strip),
      rangoli: uri(rangoliSvg.toString("utf8")),
    };
  })();
  return assets;
}

export async function shareCard({
  kicker,
  title,
  detail,
  date,
}: {
  kicker: string;
  title: string;
  detail?: string;
  // A day (YYYY-MM-DD) or a moment, shown as a date tile.
  date?: string;
}): Promise<ImageResponse> {
  const { fonts, toran, rangoli } = await loadAssets();
  const titleSize = title.length > 60 ? 64 : title.length > 36 ? 80 : 100;
  const tile = date ? dateTileParts(date) : null;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: colour.night,
        color: colour.cream,
        fontFamily: "Figtree",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- drawn into a picture, not a page */}
      <img
        src={rangoli}
        width={560}
        height={560}
        alt=""
        style={{ position: "absolute", right: -110, top: 90, opacity: 0.3 }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
      <img
        src={toran}
        width={1200}
        height={80}
        alt=""
        style={{ marginTop: 6 }}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 44,
          padding: "0 80px",
        }}
      >
        {tile && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 170,
              padding: "18px 0 16px",
              borderRadius: 34,
              background: colour.cream,
              color: colour.ink,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: 3,
                color: colour.kumkum,
              }}
            >
              {tile.month}
            </span>
            <span
              style={{
                fontFamily: "Instrument Serif",
                fontSize: 104,
                lineHeight: 1,
              }}
            >
              {tile.day}
            </span>
            <span style={{ fontSize: 32, color: colour.muted }}>
              {tile.weekday}
            </span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: tile ? 830 : 1000,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 600, color: colour.accent }}>
            {kicker}
          </div>
          <div
            style={{
              fontFamily: "Instrument Serif",
              fontSize: titleSize,
              lineHeight: 1.02,
            }}
          >
            {title}
          </div>
          {detail && (
            <div style={{ fontSize: 34, fontWeight: 600, color: colour.mist }}>
              {detail}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 80px 52px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
          <img src={rangoli} width={52} height={52} alt="" />
          <span style={{ fontFamily: "Instrument Serif", fontSize: 52 }}>
            {site.name}
          </span>
        </div>
        {title !== site.tagline && (
          <span style={{ fontSize: 30, fontWeight: 600, color: colour.mist }}>
            {site.tagline}
          </span>
        )}
      </div>
    </div>,
    { ...cardSize, fonts },
  );
}
