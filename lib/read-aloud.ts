// Reading a page aloud with the phone's own voice (the browser's speech
// synthesis): nothing is sent anywhere. Long text is read a sentence at a
// time, as some browsers stop part-way through a long one.

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// The parts of a page to read, as one text: empty parts left out, each
// ending in a full stop so the voice pauses between them.
export function readingText(parts: (string | null | undefined | false)[]) {
  return parts
    .map((p) => (p ? p.trim() : ""))
    .filter(Boolean)
    .map((p) => (/[.!?।:]$/.test(p) ? p : `${p}.`))
    .join(" ");
}

// The voice to use for a language ("en-GB", "gu"): one for that exact
// language and country if there is one, else any for the language.
export function pickVoice<V extends { lang: string }>(
  voices: readonly V[],
  lang: string,
): V | null {
  const want = lang.toLowerCase();
  const base = want.split("-")[0];
  const norm = (v: V) => v.lang.toLowerCase().replace("_", "-");
  return (
    voices.find((v) => norm(v) === want) ??
    voices.find((v) => norm(v).split("-")[0] === base) ??
    null
  );
}
