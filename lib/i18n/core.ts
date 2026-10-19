// Fills in a piece of text: the translation if there is one, else the
// English, with its "{name}" values put in. Shared by the server (every
// message) and the browser (only lib/i18n/client-messages.ts).

export type Values = Record<string, string | number>;

export function fill<K extends string>(
  messages: Partial<Record<K, string>>,
  english: Record<K, string>,
  key: K,
  values: Values = {},
): string {
  const text = messages[key] ?? english[key];
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}
