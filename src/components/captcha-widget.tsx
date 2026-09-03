"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
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
 * - If NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, uses Cloudflare Turnstile.
 * - Otherwise, falls back to playcaptcha (claw machine slide-to-verify).
 *
 * The onVerify callback receives a token string:
 * - Turnstile: the real cf-turnstile-response token
 * - Play captcha: a synthetic "playcaptcha-verified" token so the server
 *   knows the user solved the interactive challenge.
 */
export const CaptchaWidget = forwardRef<CaptchaHandle, CaptchaWidgetProps>(
  function CaptchaWidget(props, ref) {
    // Use Turnstile only when explicitly enabled AND site key is set.
    // Otherwise fall back to playcaptcha (claw machine).
    const hasTurnstileKey = publicEnv.turnstileEnabled && Boolean(publicEnv.turnstileSiteKey);
    const turnstileRef = useRef<TurnstileWidgetHandle>(null);
    const [targetToy, setTargetToy] = useState<ToyId>(randomToy);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (hasTurnstileKey) {
          turnstileRef.current?.reset();
        } else {
          // Reset play captcha by picking a new target toy (forces re-render)
          setTargetToy(randomToy());
        }
      },
    }));

    if (hasTurnstileKey) {
      return (
        <TurnstileWidget
          ref={turnstileRef}
          onVerify={props.onVerify}
          onExpire={props.onExpire}
          onError={props.onError}
          onTimeout={props.onTimeout}
          action={props.action}
          theme={props.theme}
        />
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
            props.onVerify("playcaptcha-verified");
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
