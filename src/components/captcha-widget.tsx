"use client";

import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { publicEnv } from "@/lib/env.public";
import { TurnstileWidget, type TurnstileWidgetHandle } from "./turnstile-widget";
import { ClawCaptcha, type ToyId } from "playcaptcha";
import "playcaptcha/clawcaptcha.css";

export type CaptchaHandle = TurnstileWidgetHandle & {
  reset: () => void;
};

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
  onTimeout?: () => void;
  action?: string;
  theme?: "light" | "dark" | "auto";
}

const TOYS: ToyId[] = ["duck", "bear", "panda", "bunny", "dino", "penguin", "fox", "frog", "whale", "cat", "puppy", "unicorn"];

function randomToy(): ToyId {
  return TOYS[Math.floor(Math.random() * TOYS.length)];
}

/**
 * Unified captcha widget:
 * - If NEXT_PUBLIC_TURNSTILE_ENABLED is "true" AND a site key is set, uses
 *   Cloudflare Turnstile.
 * - Otherwise, uses playcaptcha (claw machine grab-the-toy challenge).
 *
 * Safety net: if Turnstile is enabled but doesn't produce a token within 8
 * seconds, the widget automatically falls back to playcaptcha so the user
 * is never stuck on a blank/broken captcha.
 *
 * The onVerify callback receives a token string:
 * - Turnstile: the real cf-turnstile-response token
 * - Play captcha: a synthetic "playcaptcha-verified" token so the server
 *   knows the user solved the interactive challenge.
 */
export const CaptchaWidget = forwardRef<CaptchaHandle, CaptchaWidgetProps>(
  function CaptchaWidget(props, ref) {
    const wantsTurnstile = publicEnv.turnstileEnabled && Boolean(publicEnv.turnstileSiteKey);
    const [useTurnstile, setUseTurnstile] = useState(wantsTurnstile);
    const [showFallbackLink, setShowFallbackLink] = useState(false);
    const turnstileRef = useRef<TurnstileWidgetHandle>(null);
    const [targetToy, setTargetToy] = useState<ToyId>(randomToy);
    const verifiedRef = useRef(false);

    // If Turnstile doesn't verify within 8s, show a fallback link
    useEffect(() => {
      if (!useTurnstile) return;
      const timer = setTimeout(() => {
        if (!verifiedRef.current) {
          setShowFallbackLink(true);
        }
      }, 8000);
      return () => clearTimeout(timer);
    }, [useTurnstile]);

    // Track when verification happens so we don't show the fallback
    // (verifiedRef is set in handleVerify, no effect needed)

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (useTurnstile) {
          turnstileRef.current?.reset();
          setShowFallbackLink(false);
          verifiedRef.current = false;
        } else {
          // Reset play captcha by picking a new target toy (forces re-render)
          setTargetToy(randomToy());
        }
      },
    }));

    // Wrap onVerify to track that verification happened
    const handleVerify = (token: string) => {
      verifiedRef.current = true;
      props.onVerify(token);
    };

    if (useTurnstile) {
      return (
        <div className="flex flex-col items-center gap-3 w-full">
          <TurnstileWidget
            ref={turnstileRef}
            onVerify={handleVerify}
            onExpire={props.onExpire}
            onError={() => {
              // On Turnstile error, immediately fall back to playcaptcha
              setUseTurnstile(false);
              setShowFallbackLink(false);
            }}
            onTimeout={() => {
              // On Turnstile timeout, immediately fall back to playcaptcha
              setUseTurnstile(false);
              setShowFallbackLink(false);
            }}
            action={props.action}
            theme={props.theme}
          />
          {showFallbackLink && (
            <button
              type="button"
              onClick={() => setUseTurnstile(false)}
              className="text-xs font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Having trouble? Use game verification instead
            </button>
          )}
        </div>
      );
    }

    // Fallback: playcaptcha (claw machine)
    return (
      <div className="waqt-captcha-wrap flex flex-col items-center gap-3 w-full">
        <ClawCaptcha
          target={targetToy}
          onVerify={() => {
            // Synthetic token so the server knows the interactive captcha was solved.
            // The server accepts this when TURNSTILE_SECRET_KEY is not configured.
            handleVerify("playcaptcha-verified");
          }}
          title="Grab the right toy to verify"
          assetBase="/toys/"
        />
        <style>{`
          /* ── Mobile-responsive overrides for playcaptcha ── */
          .waqt-captcha-wrap .clawcap {
            width: 100%;
            max-width: 380px;
            padding: 16px 14px 14px;
            border-radius: 24px;
          }
          .waqt-captcha-wrap .clawcap-machine {
            width: 100%;
            max-width: 320px;
          }
          .waqt-captcha-wrap .clawcap-glass {
            height: 280px;
          }
          .waqt-captcha-wrap .clawcap-title {
            font-size: 1.0625rem;
            margin: 8px 0 4px;
          }
          .waqt-captcha-wrap .clawcap-sub {
            margin-bottom: 14px;
            font-size: 0.75rem;
          }
          .waqt-captcha-wrap .clawcap-steps {
            width: 100%;
            max-width: 240px;
            margin-bottom: 14px;
          }

          /* ── 375px and below (iPhone SE, small phones) ── */
          @media (max-width: 375px) {
            .waqt-captcha-wrap .clawcap {
              max-width: 100%;
              padding: 12px 10px 10px;
              border-radius: 20px;
            }
            .waqt-captcha-wrap .clawcap-machine {
              max-width: 100%;
            }
            .waqt-captcha-wrap .clawcap-glass {
              height: 240px;
              border-radius: 12px;
            }
            .waqt-captcha-wrap .clawcap-case {
              border-radius: 18px;
              padding: 6px;
            }
            .waqt-captcha-wrap .clawcap-title {
              font-size: 0.9375rem;
            }
            .waqt-captcha-wrap .clawcap-sub {
              font-size: 0.6875rem;
              margin-bottom: 10px;
            }
            .waqt-captcha-wrap .clawcap-steps {
              max-width: 100%;
              font-size: 0.75rem;
            }
            .waqt-captcha-wrap .clawcap-steps li {
              padding: 5px 0;
              font-size: 0.75rem;
            }
          }

          /* ── 320px and below (very small phones) ── */
          @media (max-width: 320px) {
            .waqt-captcha-wrap .clawcap {
              padding: 10px 8px 8px;
              border-radius: 16px;
            }
            .waqt-captcha-wrap .clawcap-glass {
              height: 200px;
            }
            .waqt-captcha-wrap .clawcap-case {
              border-radius: 14px;
              padding: 4px;
            }
            .waqt-captcha-wrap .clawcap-title {
              font-size: 0.875rem;
            }
            .waqt-captcha-wrap .clawcap-sub {
              font-size: 0.625rem;
              margin-bottom: 8px;
            }
          }
        `}</style>
      </div>
    );
  },
);
