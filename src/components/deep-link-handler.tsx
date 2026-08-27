"use client";

import { useEffect } from "react";
import { isNativeApp, onDeepLink } from "@/lib/native-bridge";

/**
 * Listens for deep links (Universal Links on iOS, App Links on Android)
 * and navigates to the corresponding route inside the app.
 * On web, this is a no-op — the browser handles URLs normally.
 */
export default function DeepLinkHandler() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let unsub: (() => void) | undefined;
    onDeepLink((url) => {
      try {
        const parsed = new URL(url);
        const path = parsed.pathname + parsed.search;
        // Navigate within the WebView
        window.location.href = path;
      } catch {
        // Invalid URL — ignore
      }
    }).then((fn) => {
      unsub = fn;
    });

    return () => { void unsub?.(); };
  }, []);

  return null;
}
