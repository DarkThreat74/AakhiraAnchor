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
      <div className="flex flex-col items-center gap-3">
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
      </div>
    );
  },
);
