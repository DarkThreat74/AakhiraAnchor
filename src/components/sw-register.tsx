"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and handles:
 * 1. Auto-reload on update (clears old caches, hard reloads)
 * 2. Offline event sync notifications (shows toast when events sync)
 * 3. Push notification subscription
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Register the service worker
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Listen for new SW updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        // Subscribe to push notifications if permission granted
        if ("PushManager" in window) {
          subscribeToPush(registration);
        }
      })
      .catch((err) => {
        console.warn("SW registration failed:", err);
      });

    // ── Handle controller change (new SW took control) ──
    const handleControllerChange = () => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // Storage might be unavailable
      }
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // ── Handle messages from SW ──
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      switch (data.type) {
        case "SW_UPDATED":
          if (!navigator.serviceWorker.controller) {
            handleControllerChange();
          }
          break;
        case "EVENT_QUEUED_OFFLINE":
          showOfflineToast("Saved offline — will sync when you're back online.");
          // Dispatch a window event so components can react (e.g. mark event as pending)
          window.dispatchEvent(new CustomEvent("waqt:offline-queued", { detail: data }));
          break;
        case "EVENT_SYNCED":
          showOfflineToast(`${data.count || 1} event${(data.count || 1) > 1 ? "s" : ""} synced to server.`);
          // Dispatch a window event so components can refetch fresh data
          window.dispatchEvent(new CustomEvent("waqt:events-synced", { detail: data }));
          break;
        case "EVENT_SYNC_FAILED":
          showOfflineToast("Some offline changes could not be synced.");
          window.dispatchEvent(new CustomEvent("waqt:sync-failed", { detail: data }));
          break;
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // ── Check for updates every 60 seconds ──
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.update();
      });
    }, 60_000);

    // ── On 'online' event, tell SW to sync outbox ──
    const handleOnline = () => {
      navigator.serviceWorker.controller?.postMessage({ type: "SYNC_OUTBOX" });
    };
    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}

// ── Subscribe to push notifications ──
async function subscribeToPush(registration: ServiceWorkerRegistration) {
  try {
    // Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      // Re-send to server in case it changed
      await sendSubscriptionToServer(existing);
      return;
    }

    // Request permission first
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Get VAPID public key from server
    const res = await fetch("/api/notifications/vapid-public-key");
    if (!res.ok) return;
    const { publicKey } = await res.json();
    if (!publicKey) return;

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    await sendSubscriptionToServer(subscription);
  } catch (err) {
    console.warn("Push subscription failed:", err);
  }
}

async function sendSubscriptionToServer(subscription: PushSubscription) {
  try {
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
  } catch {
    // Will retry on next load
  }
}

// Convert VAPID key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Show a small toast for offline/sync events ──
function showOfflineToast(message: string) {
  if (typeof document === "undefined") return;

  const existing = document.getElementById("waqt-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "waqt-toast";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-ink, #1a1815);
    color: var(--color-paper, #f5f0e8);
    padding: 12px 20px;
    border-radius: 999px;
    font-size: 13px;
    font-family: inherit;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transition: opacity 0.3s ease;
    max-width: 90vw;
    text-align: center;
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
