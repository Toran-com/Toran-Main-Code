import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// The pictures in the weekly email to committees (lib/committee-digest.ts),
// drawn on the server because email programs don't run charts:
//
// - "week": the week's visits as a big number and a bar for each day, last
//   week's as faint bars behind, in Midnight & Gold (DESIGN.md);
// - "share": a square picture of the week for the committee to post in
//   their WhatsApp groups.
//
// Everything a picture shows is in its address, signed with CRON_SECRET,
// so nothing is looked up to draw it and nobody can make Toran draw
// anything else. The numbers are a mandir's own totals: no personal data.

export type CardData = {
  kind: "week" | "share";
  // The mandir's name.
  name: string;
  // "16–22 Nov"
  week: string;
  // Visits each day, Monday first, this week and the one before.
  days: number[];
  before: number[];
  followers: number;
  newFollowers: number;
};

export const WEEK_CARD = { width: 1200, height: 640 };
export const SHARE_CARD = { width: 1080, height: 1080 };

const C = {
  night: "#14213d",
  nightDeep: "#0e1830",
  onNight: "#f6f4ef",
  nightMuted: "#c9ccda",
  gold: "#d9a441",
  goldBright: "#f0c46a",
  faint: "rgba(201,204,218,0.22)",
  leaf: "#a6dca1",
};

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`digest-card:${payload}`)
    .digest()
    .subarray(0, 18)
    .toString("base64url");
}

const clampCount = (n: unknown) =>
  Math.max(0, Math.min(10_000_000, Math.trunc(Number(n) || 0)));

// The picture's address: the data as the query, with its signature.
export function cardPath(
  data: CardData,
  secret: string | undefined = process.env.CRON_SECRET,
): string | null {
  if (!secret) return null;
  const payload = Buffer.from(
    JSON.stringify({
      k: data.kind,
      n: data.name.slice(0, 120),
      w: data.week.slice(0, 40),
      d: data.days.slice(0, 7).map(clampCount),
      b: data.before.slice(0, 7).map(clampCount),
      f: clampCount(data.followers),
      nf: Math.max(
        -1_000_000,
        Math.min(1_000_000, Math.trunc(data.newFollowers)),
      ),
    }),
  ).toString("base64url");
  return `/api/digest/card?p=${payload}&s=${sign(payload, secret)}`;
}

// The data back from an address, if the signature is right.
export function readCard(
  payload: string | null,
  signature: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): CardData | null {
  if (!secret || !payload || !signature || payload.length > 2000) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }
  try {
    const v = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const seven = (a: unknown) =>
      Array.from({ length: 7 }, (_, i) =>
        clampCount(Array.isArray(a) ? a[i] : 0),
      );
    return {
      kind: v.k === "share" ? "share" : "week",
      name: String(v.n ?? ""),
      week: String(v.w ?? ""),
      days: seven(v.d),
      before: seven(v.b),
      followers: clampCount(v.f),
      newFollowers: Math.trunc(Number(v.nf) || 0),
    };
  } catch {
    return null;
  }
}

const total = (a: number[]) => a.reduce((n, x) => n + x, 0);

// "Up 23% on last week", "Down 8% on last week", or null when there's
// nothing to compare with.
export function change(now: number, before: number): string | null {
  if (before <= 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return "Same as last week";
  return `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct)}% on last week`;
}

const grouped = (n: number) => n.toLocaleString("en-GB");

let fonts: Promise<
  { name: string; data: Buffer; weight: 400 | 700 | 800 }[]
> | null = null;

function loadFonts() {
  fonts ??= (async () => {
    const file = (name: string) =>
      readFile(path.join(process.cwd(), "assets", "fonts", name));
    const [serif, sans, bold, heavy] = await Promise.all([
      file("marcellus-latin-400-normal.woff"),
      file("mulish-latin-400-normal.woff"),
      file("mulish-latin-700-normal.woff"),
      file("mulish-latin-800-normal.woff"),
    ]);
    return [
      { name: "Marcellus", data: serif, weight: 400 as const },
      { name: "Mulish", data: sans, weight: 400 as const },
      { name: "Mulish", data: bold, weight: 700 as const },
      { name: "Mulish", data: heavy, weight: 800 as const },
    ];
  })();
  return fonts;
}

function Wordmark({ size }: { size: number }) {
  return (
    <div
      style={{
        fontFamily: "Marcellus",
        fontSize: size,
        letterSpacing: size * 0.16,
        color: C.gold,
      }}
    >
      TORAN
    </div>
  );
}

// The week's bars, with last week's as faint bars behind and the best day
// picked out in bright gold with its number.
function Bars({
  days,
  before,
  height,
  barWidth,
  gap,
}: {
  days: number[];
  before: number[];
  height: number;
  barWidth: number;
  gap: number;
}) {
  const top = Math.max(1, ...days, ...before);
  const best = days.indexOf(Math.max(...days));
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: height + 44,
          gap,
        }}
      >
        {days.map((value, i) => {
          const h = Math.max(6, Math.round((value / top) * height));
          const ghost = Math.max(6, Math.round((before[i] / top) * height));
          const isBest = value > 0 && i === best;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                width: barWidth,
                height: height + 44,
                position: "relative",
              }}
            >
              {isBest && (
                <div
                  style={{
                    fontFamily: "Mulish",
                    fontWeight: 800,
                    fontSize: 26,
                    color: C.goldBright,
                    marginBottom: 8,
                  }}
                >
                  {grouped(value)}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: barWidth,
                  height: ghost,
                  borderRadius: 12,
                  border: `3px solid ${C.faint}`,
                }}
              />
              <div
                style={{
                  width: barWidth - 16,
                  height: h,
                  borderRadius: 10,
                  background: isBest ? C.goldBright : C.gold,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap, marginTop: 14 }}>
        {DAYS.map((d, i) => (
          <div
            key={i}
            style={{
              width: barWidth,
              display: "flex",
              justifyContent: "center",
              fontFamily: "Mulish",
              fontWeight: 700,
              fontSize: 24,
              color: C.nightMuted,
            }}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

// What the solid and the outlined bars are.
function Legend() {
  const label = {
    fontFamily: "Mulish",
    fontWeight: 700,
    fontSize: 22,
    color: C.nightMuted,
  };
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}
    >
      <div
        style={{ width: 18, height: 18, borderRadius: 4, background: C.gold }}
      />
      <div style={{ ...label, marginRight: 18 }}>This week</div>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `3px solid ${C.faint}`,
        }}
      />
      <div style={label}>Last week</div>
    </div>
  );
}

function Pill({ text, size }: { text: string; size: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        padding: `${size * 0.4}px ${size * 0.8}px`,
        borderRadius: 999,
        background: text.startsWith("Down") ? "rgba(201,204,218,0.18)" : C.gold,
        color: text.startsWith("Down") ? C.onNight : C.night,
        fontFamily: "Mulish",
        fontWeight: 800,
        fontSize: size,
      }}
    >
      {text}
    </div>
  );
}

function WeekCard({ data }: { data: CardData }) {
  const visits = total(data.days);
  const vs = change(visits, total(data.before));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "48px 64px 44px",
        background: `linear-gradient(160deg, ${C.night} 0%, ${C.nightDeep} 100%)`,
        color: C.onNight,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Wordmark size={26} />
        <div
          style={{
            fontFamily: "Mulish",
            fontWeight: 700,
            fontSize: 26,
            color: C.nightMuted,
          }}
        >
          {data.week}
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, marginTop: 28 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 430,
            gap: 18,
          }}
        >
          <div
            style={{
              fontFamily: "Mulish",
              fontWeight: 700,
              fontSize: 30,
              color: C.nightMuted,
            }}
          >
            Visits this week
          </div>
          <div
            style={{
              fontFamily: "Marcellus",
              fontSize: visits >= 100_000 ? 110 : 140,
              lineHeight: 1,
              color: C.onNight,
            }}
          >
            {grouped(visits)}
          </div>
          {vs && <Pill text={vs} size={28} />}
          <div
            style={{
              display: "flex",
              fontFamily: "Mulish",
              fontSize: 28,
              color: C.nightMuted,
              marginTop: 6,
            }}
          >
            {`${grouped(data.followers)} followers${data.newFollowers > 0 ? ` · +${grouped(data.newFollowers)} this week` : ""}`}
          </div>
          <Legend />
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "flex-end",
            alignItems: "flex-end",
          }}
        >
          <Bars
            days={data.days}
            before={data.before}
            height={330}
            barWidth={74}
            gap={18}
          />
        </div>
      </div>
    </div>
  );
}

function ShareCard({ data }: { data: CardData }) {
  const visits = total(data.days);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "72px 80px 64px",
        background: `linear-gradient(170deg, ${C.night} 0%, ${C.nightDeep} 100%)`,
        color: C.onNight,
        textAlign: "center",
      }}
    >
      <Wordmark size={34} />
      <div
        style={{
          width: 120,
          height: 4,
          borderRadius: 4,
          background: C.gold,
          marginTop: 28,
        }}
      />
      <div
        style={{
          fontFamily: "Mulish",
          fontWeight: 700,
          fontSize: 40,
          color: C.nightMuted,
          marginTop: 40,
        }}
      >
        {`This week, ${data.week}`}
      </div>
      <div
        style={{
          fontFamily: "Marcellus",
          fontSize: visits >= 100_000 ? 170 : 220,
          lineHeight: 1.05,
          color: C.goldBright,
          marginTop: 24,
        }}
      >
        {grouped(visits)}
      </div>
      <div
        style={{
          fontFamily: "Mulish",
          fontWeight: 800,
          fontSize: 48,
          color: C.onNight,
          marginTop: 8,
        }}
      >
        {visits === 1 ? "visit to" : "visits to"}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontFamily: "Marcellus",
          fontSize: data.name.length > 34 ? 54 : 66,
          lineHeight: 1.15,
          color: C.onNight,
          marginTop: 26,
          maxWidth: 900,
        }}
      >
        {data.name}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "flex-end",
          justifyContent: "center",
          marginTop: 24,
        }}
      >
        <Bars
          days={data.days}
          before={data.before}
          height={150}
          barWidth={70}
          gap={16}
        />
      </div>
      <div
        style={{
          fontFamily: "Mulish",
          fontWeight: 700,
          fontSize: 34,
          color: C.nightMuted,
          marginTop: 30,
        }}
      >
        See what&apos;s on, and follow us on Toran
      </div>
    </div>
  );
}

export async function drawCard(data: CardData): Promise<ImageResponse> {
  const size = data.kind === "share" ? SHARE_CARD : WEEK_CARD;
  return new ImageResponse(
    data.kind === "share" ? (
      <ShareCard data={data} />
    ) : (
      <WeekCard data={data} />
    ),
    {
      ...size,
      fonts: await loadFonts(),
      headers: {
        // The same address always draws the same picture.
        "cache-control": "public, max-age=31536000, immutable",
      },
    },
  );
}
