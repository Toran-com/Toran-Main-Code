// Phone notifications in the browser (decision 0024): turning them on or
// off, and keeping the server's list of mandirs in step with the ones
// followed on this phone. Only runs in the browser.

import { followingSnapshot, parseFollowing } from "@/lib/follow";

export const PUSH_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState =
  | "loading"
  | "off"
  | "on"
  | "denied"
  // iPhone and iPad: only once Toran is on the Home Screen.
  | "ios-install"
  | "unsupported";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function standalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  try {
    return (await navigator.serviceWorker?.ready) ?? null;
  } catch {
    return null;
  }
}

export async function pushState(): Promise<PushState> {
  if (!PUSH_KEY || typeof window === "undefined") return "unsupported";
  if (isIos() && !standalone() && !("PushManager" in window)) {
    return "ios-install";
  }
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return isIos() ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

async function save(sub: PushSubscription): Promise<boolean> {
  const response = await fetch("/api/push", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      mandirs: parseFollowing(followingSnapshot()),
    }),
  });
  return response.ok;
}

export async function turnOn(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "off";
  }
  const reg = await registration();
  if (!reg) return "off";
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(PUSH_KEY),
    }));
  return (await save(sub)) ? "on" : "off";
}

export async function turnOff(): Promise<PushState> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => false);
  }
  return "off";
}

// After following or unfollowing: if notifications are on, tell the
// server which mandirs now. Never gets in the way.
export async function syncPushMandirs(): Promise<void> {
  try {
    if (!PUSH_KEY || !("serviceWorker" in navigator)) return;
    const reg = await registration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) await save(sub);
  } catch {
    // Next time.
  }
}
