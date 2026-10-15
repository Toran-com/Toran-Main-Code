import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Lets families add Toran to their phone's home screen, where it opens
// full screen like an app (decision 0002: one web app, no app stores).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name}: ${site.tagline}`,
    short_name: site.name,
    description: site.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#faf8f4",
    lang: "en-GB",
    categories: ["lifestyle", "events"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "What's on", url: "/whats-on" },
      { name: "Mandirs", url: "/mandirs" },
      { name: "Festivals", url: "/festivals" },
    ],
  };
}
