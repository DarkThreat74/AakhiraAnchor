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

export default function QiblaCompassClient() {
  const [data, setData] = useState<QiblaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionSupported, setPermissionSupported] = useState(true);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  // Fetch Qibla data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/qibla").catch(() => null);
        if (cancelled) return;
        if (res?.ok) {
          const json = await res.json().catch(() => null);
          if (json) setData(json);
          else setError("Failed to load Qibla data.");
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

  // Cleanup orientation listener on unmount
  useEffect(() => {
    return () => {
      if (orientationListenerRef.current) {
        window.removeEventListener("deviceorientationabsolute", orientationListenerRef.current as EventListener);
        window.removeEventListener("deviceorientation", orientationListenerRef.current as EventListener);
      }
    };
  }, []);

  const handleEnableCompass = useCallback(async () => {
    // iOS 13+ requires explicit permission via user gesture
    const doe = typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined;
    // requestPermission is iOS-specific and not in the TS DOM types
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
      // Use webkitCompassHeading on iOS (more accurate, already compensated)
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === "number" && !Number.isNaN(webkitHeading)) {
        setHeading(webkitHeading);
      } else if (typeof e.alpha === "number" && e.alpha !== null) {
        // Android: alpha is 0-360 counterclockwise from North. Compass heading = 360 - alpha.
        setHeading((360 - e.alpha) % 360);
      }
    };

    orientationListenerRef.current = handler;
    // Prefer absolute event when available (gives true compass heading)
    window.addEventListener("deviceorientationabsolute", handler as EventListener);
    window.addEventListener("deviceorientation", handler as EventListener);
  }, []);

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

  // The needle angle: Qibla bearing minus current heading
  // When heading is null (desktop/no compass), show static bearing from North
  const needleAngle = heading !== null ? data.bearing - heading : data.bearing;

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
        {/* Compass dial — rotates with device heading */}
        <div
          className="absolute inset-0 rounded-full border-4 transition-transform duration-100 ease-out"
          style={{
            borderColor: "var(--color-paper-3)",
            backgroundColor: "var(--color-paper)",
            transform: heading !== null ? `rotate(${-heading}deg)` : "none",
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

        {/* Qibla needle — points to Mecca relative to the dial */}
        <div
          className="absolute left-1/2 top-1/2 transition-transform duration-100 ease-out"
          style={{
            transform: `translate(-50%, -50%) rotate(${needleAngle}deg)`,
            width: "100%",
            height: "100%",
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
          direction from North — use a physical compass to find it.
        </p>
      )}

      {permissionGranted && heading !== null && (
        <p className="mt-4 text-center text-xs" style={{ color: "var(--color-success)" }}>
          ✓ Compass active — rotate your phone until the 🕋 points straight up
        </p>
      )}

      {permissionGranted && heading === null && (
        <p className="mt-4 text-center text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Waiting for compass data… try moving your phone in a figure-8 to calibrate.
        </p>
      )}
    </div>
  );
}
