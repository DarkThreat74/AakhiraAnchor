"use client";

import { useState, useEffect, useCallback } from "react";
import { getOfflineDB } from "./db";

interface UseLocalDataOptions {
  // If true, don't fetch from API — just read from IndexedDB
  offlineOnly?: boolean;
  // Skip the API fetch entirely (e.g. for pages that get data from props)
  skipFetch?: boolean;
}

/**
 * Local-first data hook for list-style API responses.
 *
 * Pattern:
 * 1. Read from IndexedDB instantly (if cached) → render immediately
 * 2. Fetch from API in background
 * 3. Update IndexedDB + React state with fresh data
 *
 * Returns: { data, loading, refetch }
 * - loading is true ONLY if there's no cached data yet
 * - If cached data exists, loading is false immediately and data is returned
 */
export function useLocalData<T>(
  cacheKey: string,
  cacheStore: string, // Dexie table name
  apiUrl: string | null,
  options: UseLocalDataOptions = {}
): {
  data: T | null;
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(async () => {
    setRefetchTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (options.skipFetch) {
      // Defer to avoid cascading renders
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    let cancelled = false;

    (async () => {
      // Step 1: Read from IndexedDB instantly
      try {
        const db = getOfflineDB();
        // @ts-expect-error — dynamic table access
        const cached = await db[cacheStore].get(cacheKey);
        if (cached && !cancelled) {
          setData((cached as { data?: T }).data ?? (cached as T));
          setLoading(false); // Stop loading immediately — we have cached data
        }
      } catch {
        // IndexedDB read failed — continue to API fetch
      }

      if (options.offlineOnly) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Step 2: Fetch from API in background
      if (!apiUrl) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
          if (!cancelled && !data) setLoading(false);
          return;
        }
        const freshData = await res.json();
        if (cancelled) return;

        // Step 3: Update React state with fresh data
        setData(freshData);
        setLoading(false);

        // Step 4: Cache in IndexedDB for next time
        try {
          const db = getOfflineDB();
          // @ts-expect-error — dynamic table access
          await db[cacheStore].put({
            id: cacheKey,
            data: freshData,
            _cachedAt: Date.now(),
          });
        } catch {
          // IndexedDB write failed — non-critical
        }
      } catch {
        // Network failed — if we have cached data, keep showing it
        if (!cancelled && !data) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, cacheStore, apiUrl, refetchTrigger, options.offlineOnly, options.skipFetch, data]);

  return { data, loading, refetch };
}

/**
 * Local-first hook for date-based data (events, prayer logs, prayer times).
 * Caches by date key so navigating to a previously-visited date is instant.
 */
export function useLocalDateData<T>(
  date: string,
  cacheStore: string,
  apiUrl: string | null,
  options: UseLocalDataOptions = {}
): {
  data: T | null;
  loading: boolean;
  refetch: () => Promise<void>;
} {
  return useLocalData<T>(date, cacheStore, apiUrl, options);
}
