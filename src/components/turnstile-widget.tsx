"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { publicEnv } from "@/lib/env.public";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (error: string) => void;
          "timeout-callback"?: () => void;
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
  onTimeout?: () => void;
  action?: string;
  theme?: "light" | "dark" | "auto";
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
// Cloudflare's test site key — always passes verification (for dev only)
const TEST_SITE_KEY = "1x00000000000000000000AA";
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => {
        scriptLoadPromise = null; // Reset so retry is possible
        reject(new Error("Turnstile script load failed"));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null; // Reset so retry is possible
      reject(new Error("Turnstile script load failed"));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onVerify, onExpire, onError, onTimeout, action, theme = "light" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [loadError, setLoadError] = useState(false);

    // Use test site key in development if no real key is configured
    const siteKey = publicEnv.turnstileSiteKey || (process.env.NODE_ENV !== "production" ? TEST_SITE_KEY : "");

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      let cancelled = false;

      // If no site key at all (production without config), show error
      if (!siteKey) {
        setLoadError(true);
        return;
      }

      setLoadError(false);

      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          // Don't double-render if already rendered
          if (widgetIdRef.current) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action,
            theme,
            callback: onVerify,
            "expired-callback": onExpire,
            "error-callback": (errorCode: string) => {
              onError?.(errorCode);
            },
            "timeout-callback": () => {
              onTimeout?.();
            },
          });
        })
        .catch(() => {
          if (!cancelled) setLoadError(true);
        });

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // non-critical
          }
          widgetIdRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loadError) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center" style={{ borderColor: "var(--color-paper-3)" }}>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Security check couldn&apos;t load.
          </p>
          <button
            onClick={() => {
              setLoadError(false);
              scriptLoadPromise = null;
              // Force re-render by toggling state
              setTimeout(() => {
                if (containerRef.current && window.turnstile && !widgetIdRef.current) {
                  widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    action,
                    theme,
                    callback: onVerify,
                    "expired-callback": onExpire,
                    "error-callback": (errorCode: string) => onError?.(errorCode),
                    "timeout-callback": () => onTimeout?.(),
                  });
                }
              }, 100);
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
          >
            Retry
          </button>
        </div>
      );
    }

    return <div ref={containerRef} className="cf-turnstile-container" />;
  },
);
