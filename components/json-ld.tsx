import { scriptJson } from "@/lib/structured-data";

// Search-engine data for a page. Invisible to visitors.
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: scriptJson(data) }}
    />
  );
}
