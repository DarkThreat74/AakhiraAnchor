"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Compass, MapPin, Navigation } from "lucide-react";
import Link from "next/link";

interface QiblaData {
  bearing: number;
  distance: number;
  cardinal: string;
  userLocation: { latitude: number; longitude: number };
}

/**
 * Smoothed Qibla compass.
 *
 * Key fixes vs the old version:
 * 1. Heading is stored in a ref, NOT React state. The deviceorientation
 *    event fires 30-60+ times/sec; setHeading on each one caused React
 *    re-render storms and janky transition-transform fighting.
 * 2. A single requestAnimationFrame loop reads the ref, lerps toward the
 *    target heading (low-pass filter), and writes the transform directly
 *    to the DOM via ref. No React re-render per frame.
 * 3. The CSS transition-transform is removed. The rAF loop IS the
 *    smoothing. This eliminates the "transition fights rapid updates"
 *    glitch that was most visible when the phone was held vertically
 *    (gamma/beta large => alpha jumps => heading jumps => transition
 *    lags then snaps).
 * 4. Shortest-path angular interpolation: we lerp along the smaller
 *    arc between current and target heading, so rotating from 350° to
 *    10° goes forward 20°, not backward 340°.
 */
export default function QiblaCompassClient() {
  const [data, setData] = useState<QiblaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionSupported, setPermissionSupported] = useState(true);
  const [hasHeading, setHasHeading] = useState(false);

  // Refs for smooth animation — never trigger re-renders
  const targetHeadingRef = useRef<number | null>(null); // raw heading from sensor
  const currentHeadingRef = useRef(0); // smoothed heading for the dial
  const targetNeedleRef = useRef(0); // raw needle angle (bearing - heading)
  const currentNeedleRef = useRef(0); // smoothed needle angle
  const dialRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const bearingRef = useRef(0);

  // ── Fetch Qibla data ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/qibla").catch(() => null);
        if (cancelled) return;
        if (res?.ok) {
          const json = await res.json().catch(() => null);
          if (json) {
            setData(json);
            bearingRef.current = json.bearing;
            // Set initial needle to static bearing (no compass yet)
            targetNeedleRef.current = json.bearing;
            currentNeedleRef.current = json.bearing;
          } else {
            setError("Failed to load Qibla data.");
          }
        } else if (res?.status === 400) {
          setError("Location not set. Please set your location in Settings first.");
        } else {
          setError("Failed to load Qibla direction.");
        }
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── rAF smoothing loop ──
  // Low-pass filter: current += (target - current) * alpha
  // alpha = 0.15 gives smooth but responsive movement
  const SMOOTH_ALPHA = 0.15;

  // Shortest-path angular delta: returns the smallest signed delta
  // from `from` to `to` in degrees, in range (-180, 180].
  function angleDelta(from: number, to: number): number {
    let d = ((to - from) % 360 + 360) % 360;
    if (d > 180) d -= 360;
    return d;
  }

  useEffect(() => {
    const tick = () => {
      const targetHeading = targetHeadingRef.current;
      if (targetHeading !== null) {
        // Smooth the dial heading
        const dh = angleDelta(currentHeadingRef.current, targetHeading);
        currentHeadingRef.current = (currentHeadingRef.current + dh * SMOOTH_ALPHA + 360) % 360;

        // Smooth the needle angle (bearing - heading)
        const targetNeedle = (bearingRef.current - currentHeadingRef.current + 360) % 360;
        const dn = angleDelta(currentNeedleRef.current, targetNeedle);
        currentNeedleRef.current = (currentNeedleRef.current + dn * SMOOTH_ALPHA + 360) % 360;

        // Apply transforms directly to DOM — no React re-render
        if (dialRef.current) {
          dialRef.current.style.transform = `rotate(${-currentHeadingRef.current}deg)`;
        }
        if (needleRef.current) {
          needleRef.current.style.transform = `translate(-50%, -50%) rotate(${currentNeedleRef.current}deg)`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Enable compass (iOS permission + listener) ──
  const handleEnableCompass = useCallback(async () => {
    const doe = typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined;
    const doeWithPermission = doe as unknown as { requestPermission?: (absolute?: boolean) => Promise<string> };
    const needsPermission = doeWithPermission && typeof doeWithPermission.requestPermission === "function";

    if (needsPermission) {
      try {
        const result = await doeWithPermission.requestPermission!(true);
        if (result !== "granted") {
          setPermissionSupported(false);
          return;
        }
      } catch {
        setPermissionSupported(false);
        return;
      }
    } else if (!doe) {
      setPermissionSupported(false);
      return;
    }

    setPermissionGranted(true);

    const handler = (e: DeviceOrientationEvent) => {
      // iOS: webkitCompassHeading is already compensated and gives
      // the true compass heading (0 = North, clockwise).
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === "number" && !Number.isNaN(webkitHeading)) {
        targetHeadingRef.current = webkitHeading;
        if (!hasHeading) setHasHeading(true);
        return;
      }

      // Android: when the phone is held vertically (screen facing the user,
      // top pointing up), alpha alone is NOT the compass heading. The W3C
      // spec's worked example (Appendix A.1) gives the full formula for
      // computing compass heading from alpha + beta + gamma when the device
      // is in portrait-vertical position.
      if (typeof e.alpha === "number" && e.alpha !== null && typeof e.beta === "number" && typeof e.gamma === "number") {
        // If absolute is true or deviceorientationabsolute is supported,
        // alpha is already absolute. Otherwise (relative), the heading
        // is less accurate but we still compute it.
        const heading = compassHeading(e.alpha, e.beta, e.gamma);
        if (!Number.isNaN(heading)) {
          targetHeadingRef.current = heading;
          if (!hasHeading) setHasHeading(true);
        }
      }
    };

    // Prefer the absolute event when available
    window.addEventListener("deviceorientationabsolute", handler as EventListener);
    window.addEventListener("deviceorientation", handler as EventListener);
  }, [hasHeading]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-accent)", borderRightColor: "var(--color-accent)" }} />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Finding Qibla…</p>
        </div>
      </div>
    );
  }

  // ── Error / no location ──
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md py-8 sm:py-12">
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-paper-2)" }}>
            <Compass className="h-6 w-6" style={{ color: "var(--color-ink-muted)" }} />
          </div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Qibla Direction</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
            {error || "Unable to determine Qibla direction."}
          </p>
          <Link
            href="/settings"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", backgroundColor: "var(--color-paper-2)", minHeight: 44 }}
          >
            <MapPin className="h-4 w-4" />
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Qibla Direction</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Face the Kaaba in Mecca for prayer
        </p>
      </div>

      {/* ── Compass ── */}
      <div className="relative mx-auto mb-6" style={{ width: "min(80vw, 320px)", height: "min(80vw, 320px)" }}>
        {/* Compass dial — rotates with device heading (via rAF, no CSS transition) */}
        <div
          ref={dialRef}
          className="absolute inset-0 rounded-full border-4"
          style={{
            borderColor: "var(--color-paper-3)",
            backgroundColor: "var(--color-paper)",
            willChange: "transform",
          }}
        >
          {/* Cardinal directions on the dial */}
          {["N", "E", "S", "W"].map((dir, i) => (
            <div
              key={dir}
              className="absolute left-1/2 top-1/2 text-sm font-bold"
              style={{
                color: dir === "N" ? "var(--color-error)" : "var(--color-ink-soft)",
                transform: `rotate(${i * 90}deg) translateY(-130px) rotate(${-i * 90}deg) translateX(-50%)`,
                transformOrigin: "center",
              }}
            >
              {dir}
            </div>
          ))}
          {/* Tick marks every 30 degrees */}
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{
                width: 1,
                height: i % 3 === 0 ? 12 : 6,
                backgroundColor: "var(--color-paper-3)",
                transform: `rotate(${i * 30}deg) translateY(-140px)`,
                transformOrigin: "center bottom",
              }}
            />
          ))}
        </div>

        {/* Qibla needle — points to Mecca relative to the dial (via rAF) */}
        <div
          ref={needleRef}
          className="absolute left-1/2 top-1/2"
          style={{
            transform: "translate(-50%, -50%) rotate(0deg)",
            width: "100%",
            height: "100%",
            willChange: "transform",
          }}
        >
          {/* Kaaba icon at the tip */}
          <div
            className="absolute left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full"
            style={{
              top: 12,
              backgroundColor: "var(--color-ink)",
              color: "var(--color-paper)",
            }}
          >
            <span className="text-lg">🕋</span>
          </div>
          {/* Needle line */}
          <div
            className="absolute left-1/2 top-12 -translate-x-1/2"
            style={{
              width: 3,
              height: "calc(50% - 60px)",
              backgroundColor: "var(--color-accent)",
              borderRadius: 2,
            }}
          />
        </div>

        {/* Center dot */}
        <div
          className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: "var(--color-accent)" }}
        />
      </div>

      {/* ── Info panel ── */}
      <div className="space-y-3">
        <div
          className="flex items-center justify-between rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>Bearing</span>
          </div>
          <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-ink)" }}>
            {data.bearing}° {data.cardinal}
          </span>
        </div>

        <div
          className="flex items-center justify-between rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>Distance to Kaaba</span>
          </div>
          <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-ink)" }}>
            {data.distance.toLocaleString()} km
          </span>
        </div>

        <div
          className="flex items-center justify-between rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>Your location</span>
          </div>
          <span className="text-xs tabular-nums" style={{ color: "var(--color-ink-muted)" }}>
            {data.userLocation.latitude.toFixed(4)}°, {data.userLocation.longitude.toFixed(4)}°
          </span>
        </div>
      </div>

      {/* ── Live compass toggle ── */}
      {!permissionGranted && permissionSupported && (
        <button
          onClick={handleEnableCompass}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
          style={{
            borderColor: "var(--color-accent)",
            color: "var(--color-accent)",
            backgroundColor: "color-mix(in oklab, var(--color-accent) 8%, transparent)",
            minHeight: 48,
          }}
        >
          <Compass className="h-5 w-5" />
          Enable live compass
        </button>
      )}

      {!permissionSupported && (
        <p className="mt-4 text-center text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Live compass not available on this device. The bearing above shows the
          direction from North. Use a physical compass to find it.
        </p>
      )}

      {permissionGranted && hasHeading && (
        <p className="mt-4 text-center text-xs" style={{ color: "var(--color-success)" }}>
          ✓ Compass active. Rotate your phone until the 🕋 points straight up.
        </p>
      )}

      {permissionGranted && !hasHeading && (
        <p className="mt-4 text-center text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Waiting for compass data. Try moving your phone in a figure-8 to calibrate.
        </p>
      )}
    </div>
  );
}

/**
 * Compute compass heading from deviceorientation alpha/beta/gamma
 * when the device is held in portrait, screen facing the user, top up.
 *
 * This is the W3C spec's worked example (Appendix A.1) translated to JS.
 * Returns degrees 0-360, clockwise from North. NaN if inputs are invalid.
 *
 * Why this matters: when the phone is vertical, `360 - alpha` is WRONG.
 * The correct heading requires all three angles. The old code used
 * `360 - alpha` which only works when the phone is lying flat (screen up),
 * causing the "glitch when vertical" the user reported.
 */
function compassHeading(alpha: number, beta: number, gamma: number): number {
  if (alpha == null || beta == null || gamma == null) return NaN;

  const alphaRad = alpha * (Math.PI / 180);
  const betaRad = beta * (Math.PI / 180);
  const gammaRad = gamma * (Math.PI / 180);

  const cA = Math.cos(alphaRad);
  const sA = Math.sin(alphaRad);
  const sB = Math.sin(betaRad);
  const cG = Math.cos(gammaRad);
  const sG = Math.sin(gammaRad);

  const rA = -cA * sG - sA * sB * cG;
  const rB = -sA * sG + cA * sB * cG;

  let compassHeading = Math.atan(rA / rB);

  if (rB < 0) {
    compassHeading += Math.PI;
  } else if (rA < 0) {
    compassHeading += 2 * Math.PI;
  }

  // Convert to degrees, normalize to 0-360
  return (compassHeading * (180 / Math.PI) + 360) % 360;
}
