import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// The picture WhatsApp, Facebook and others show under a shared link:
// the toran garland across the top, then what the page is about.

export const cardSize = { width: 1200, height: 630 };

const colour = {
  bg: "#faf8f4",
  ink: "#1b1a2c",
  muted: "#5d5a6e",
  peacock: "#0b6b68",
  marigold: "#f0a00a",
  marigoldInk: "#8a5a00",
  leaf: "#3f7d3a",
};

function Garland() {
  const drops = Array.from({ length: 29 }, (_, i) => i);
  return (
    <svg width="1200" height="90" viewBox="0 0 1200 90">
      <path
        d="M0 14 Q600 46 1200 14"
        fill="none"
        stroke={colour.marigoldInk}
        strokeWidth="4"
      />
      {drops.map((i) => {
        const x = 20 + i * 41.4;
        const t = x / 1200;
        const y = 14 + 32 * 2 * t * (1 - t) + 4;
        return i % 2 === 0 ? (
          <circle key={i} cx={x} cy={y + 16} r="13" fill={colour.marigold} />
        ) : (
          <path
            key={i}
            d={`M${x} ${y} q12 20 0 44 q-12 -24 0 -44z`}
            fill={colour.leaf}
          />
        );
      })}
    </svg>
  );
}

export function shareCard({
  kicker,
  title,
  detail,
}: {
  kicker: string;
  title: string;
  detail?: string;
}): ImageResponse {
  const titleSize = title.length > 60 ? 56 : title.length > 36 ? 68 : 84;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: colour.bg,
        color: colour.ink,
      }}
    >
      <Garland />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
          padding: "0 80px",
        }}
      >
        <div
          style={{ fontSize: 34, color: colour.marigoldInk, fontWeight: 600 }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1,
          }}
        >
          {title}
        </div>
        {detail && (
          <div style={{ fontSize: 38, color: colour.muted }}>{detail}</div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 80px 48px",
          fontSize: 30,
        }}
      >
        <span style={{ color: colour.peacock, fontWeight: 800, fontSize: 40 }}>
          {site.name}
        </span>
        <span style={{ color: colour.muted }}>{site.tagline}</span>
      </div>
    </div>,
    cardSize,
  );
}
