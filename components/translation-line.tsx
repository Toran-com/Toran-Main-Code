import { Badge } from "@/components/public-shell";
import { LOCALES } from "@/lib/i18n";
import type { ReviewLine } from "@/lib/translation-review";

// One line of the Gujarati review pack: English, Gujarati, and whether it
// is new or has changed since a reviewer last checked it.
export function TranslationLine({ line }: { line: ReviewLine }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 self-start">
        <span className="font-semibold tabular-nums">{line.number}</span>
        {line.status === "new" && <Badge tone="marigold">New</Badge>}
        {line.status === "changed" && <Badge tone="peacock">Changed</Badge>}
      </div>
      <div className="flex flex-col gap-1">
        <p>{line.english}</p>
        {line.was && line.was.english !== line.english && (
          <p className="text-muted text-base">Before: {line.was.english}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p lang={LOCALES.gu.lang}>{line.gujarati}</p>
        {line.was && line.was.gujarati !== line.gujarati && (
          <p className="text-muted text-base">
            Before: <span lang={LOCALES.gu.lang}>{line.was.gujarati}</span>
          </p>
        )}
      </div>
    </>
  );
}
