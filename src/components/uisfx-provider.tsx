"use client";

import { createContext, useContext, useEffect, useRef, useCallback, useState, type ReactNode } from "react";
import { createUISFX, type UISFXPlayer, type CueName, type PlayOptions, type PlayingSFX } from "uisfx";

interface UISFXContextValue {
  play: (cue: CueName, options?: PlayOptions) => PlayingSFX | null;
  unlock: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  isEnabled: boolean;
  toggle: () => void;
}

const UISFXContext = createContext<UISFXContextValue | null>(null);

export function UISFXProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<UISFXPlayer | null>(null);
  // Start with a stable default to avoid hydration mismatch.
  // The stored preference is applied in useEffect after mount.
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("waqt:sound");
      if (stored) {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate localStorage hydration after mount
        setIsEnabled(parsed.enabled !== false);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const player = createUISFX({
      pack: "soft",
      volume: 0.5,
      preferences: { key: "waqt:sound" },
    });
    playerRef.current = player;

    // Unlock on first user interaction (required by browsers)
    const handleFirstInteraction = () => {
      player.unlock().catch(() => {});
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      player.destroy().catch(() => {});
    };
  }, []);

  const play = useCallback((cue: CueName, options?: PlayOptions) => {
    if (!playerRef.current) return null;
    return playerRef.current.play(cue, options);
  }, []);

  const unlock = useCallback(async () => {
    await playerRef.current?.unlock();
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    playerRef.current?.setEnabled(enabled);
    setIsEnabled(enabled);
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!isEnabled);
  }, [isEnabled, setEnabled]);

  return (
    <UISFXContext.Provider value={{ play, unlock, setEnabled, isEnabled, toggle }}>
      {children}
    </UISFXContext.Provider>
  );
}

export function useUISFX() {
  const ctx = useContext(UISFXContext);
  if (!ctx) {
    // Safe fallback if provider isn't mounted — returns no-op
    return {
      play: () => null,
      unlock: async () => {},
      setEnabled: () => {},
      isEnabled: true,
      toggle: () => {},
    } as UISFXContextValue;
  }
  return ctx;
}
