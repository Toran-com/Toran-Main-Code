"use client";

import { createContext, type ReactNode } from "react";
import type { ClientKey } from "@/lib/i18n/client-messages";

// The browser's lines in the page's language, when it isn't English. Sent
// with Gujarati pages only (app/(public)/gu/layout.tsx), so English pages
// don't download the Gujarati.
export const MessagesContext = createContext<Record<ClientKey, string> | null>(
  null,
);

export function MessagesProvider({
  messages,
  children,
}: {
  messages: Record<ClientKey, string>;
  children: ReactNode;
}) {
  return <MessagesContext value={messages}>{children}</MessagesContext>;
}
