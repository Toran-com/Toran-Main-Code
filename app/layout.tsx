import type { Metadata, Viewport } from "next";
import {
  Figtree,
  Instrument_Serif,
  Noto_Serif_Gujarati,
} from "next/font/google";
import { Suspense } from "react";
import { CountVisits } from "@/components/count-visits";
import { pageMetadata, site, siteUrl } from "@/lib/site";
import "./globals.css";

// Headlines: a graceful serif, with a matching one for Gujarati. The
// Gujarati one isn't fetched ahead: browsers download it only on pages
// with Gujarati headings (its unicode range), so English pages stay light.
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const gujaratiSerif = Noto_Serif_Gujarati({
  variable: "--font-gujarati-serif",
  subsets: ["gujarati"],
  weight: "600",
  preload: false,
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Page addresses in metadata are completed with the live site's address.
  metadataBase: new URL(siteUrl()),
  ...pageMetadata(),
  robots: site.launched ? undefined : { index: false, follow: false },
  // The toran doorway icon, in the browser tab and on the home screen.
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
};

// The phone's status bar matches the page, in light and dark mode.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1120" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${instrument.variable} ${gujaratiSerif.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Suspense fallback={null}>
          <CountVisits />
        </Suspense>
      </body>
    </html>
  );
}
