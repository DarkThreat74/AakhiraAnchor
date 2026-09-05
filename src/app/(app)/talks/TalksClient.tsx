"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, Folder, ChevronLeft, Play, Pause, SkipBack, SkipForward, Download, Trash2, Clock, Headphones } from "lucide-react";

interface Folder {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

interface Talk {
  id: string;
  title: string;
  speaker: string | null;
  description: string | null;
  folderId: string | null;
  storageKey: string | null;
  fileSize: number | null;
  duration: number | null;
  externalUrl: string | null;
  streamUrl: string | null;
  addedAt: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TalksClient() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [talks, setTalks] = useState<Talk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [currentTalk, setCurrentTalk] = useState<Talk | null>(null);
  const [offlineTalks, setOfflineTalks] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      try {
        const res = await fetch("/api/talks").catch(() => null);
        if (cancelled) return;
        if (res?.ok) {
          const data = await res.json().catch(() => null);
          if (data?.folders) setFolders(data.folders);
          if (data?.talks) setTalks(data.talks);
        }
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Check which talks are cached offline
  useEffect(() => {
    if (!("caches" in window)) return;
    (async () => {
      try {
        const cache = await caches.open("waqt-v31-audio");
        const keys = await cache.keys();
        const offlineIds = new Set<string>();
        for (const key of keys) {
          const url = new URL(key.url);
          const talkId = url.searchParams.get("talkId");
          if (talkId) offlineIds.add(talkId);
        }
        setOfflineTalks(offlineIds);
      } catch {
        /* non-critical */
      }
    })();
  }, []);

  const talksInFolder = (folderId: string | null) =>
    talks.filter((t) => t.folderId === folderId);

  const uncategorized = talksInFolder(null);

  // Get the next talk in the same folder (or uncategorized) for auto-advance
  const getNextTalk = useCallback((talk: Talk): Talk | null => {
    const siblings = talk.folderId ? talks.filter((t) => t.folderId === talk.folderId) : talks.filter((t) => !t.folderId);
    const idx = siblings.findIndex((t) => t.id === talk.id);
    if (idx >= 0 && idx < siblings.length - 1) return siblings[idx + 1];
    return null;
  }, [talks]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-accent)", borderRightColor: "var(--color-accent)" }} />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading talks…</p>
        </div>
      </div>
    );
  }

  // ── Folder view (inside a folder) ──
  if (selectedFolder) {
    const folderTalks = talksInFolder(selectedFolder.id);
    return (
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => setSelectedFolder(null)}
          className="mb-4 flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--color-ink-muted)" }}
        >
          <ChevronLeft className="h-4 w-4" /> All folders
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
            <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>{selectedFolder.name}</h1>
          </div>
          {selectedFolder.description && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>{selectedFolder.description}</p>
          )}
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>{folderTalks.length} talks</p>
        </div>

        {folderTalks.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
            <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>No talks in this folder yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {folderTalks.map((talk) => (
              <TalkCard
                key={talk.id}
                talk={talk}
                onPlay={() => setCurrentTalk(talk)}
                isOffline={offlineTalks.has(talk.id)}
                onToggleOffline={() => {/* handled in player */}}
              />
            ))}
          </div>
        )}

        {currentTalk && (
          <AudioPlayer
            talk={currentTalk}
            onClose={() => setCurrentTalk(null)}
            onNext={() => {
              const next = getNextTalk(currentTalk);
              if (next) setCurrentTalk(next);
            }}
            onOfflineStatusChange={(talkId, isOffline) => {
              setOfflineTalks((prev) => {
                const next = new Set(prev);
                if (isOffline) next.add(talkId);
                else next.delete(talkId);
                return next;
              });
            }}
          />
        )}
      </div>
    );
  }

  // ── Main view (folder list) ──
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Talks Library</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Curated lectures and khutbahs from trusted speakers
        </p>
      </div>

      {folders.length === 0 && talks.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-paper-2)" }}>
            <Headphones className="h-6 w-6" style={{ color: "var(--color-ink-muted)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>No talks available yet</p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>
            Lectures from trusted speakers will appear here soon.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Folders */}
          {folders.map((folder) => {
            const count = talksInFolder(folder.id).length;
            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder)}
                className="flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-colors hover:bg-[var(--color-paper-2)]"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "color-mix(in oklab, var(--color-accent) 10%, transparent)" }}>
                  <Folder className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--color-ink)" }}>{folder.name}</p>
                  {folder.description && (
                    <p className="mt-0.5 truncate text-xs" style={{ color: "var(--color-ink-muted)" }}>{folder.description}</p>
                  )}
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-muted)" }}>{count} {count === 1 ? "talk" : "talks"}</p>
                </div>
                <ChevronLeft className="h-4 w-4 rotate-180 shrink-0" style={{ color: "var(--color-ink-muted)" }} />
              </button>
            );
          })}

          {/* Uncategorized talks (shown directly) */}
          {uncategorized.length > 0 && (
            <div>
              {folders.length > 0 && (
                <p className="mb-2 mt-4 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>Individual talks</p>
              )}
              <div className="space-y-2">
                {uncategorized.map((talk) => (
                  <TalkCard
                    key={talk.id}
                    talk={talk}
                    onPlay={() => setCurrentTalk(talk)}
                    isOffline={offlineTalks.has(talk.id)}
                    onToggleOffline={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {currentTalk && (
        <AudioPlayer
          talk={currentTalk}
          onClose={() => setCurrentTalk(null)}
          onNext={() => {
            const next = getNextTalk(currentTalk);
            if (next) setCurrentTalk(next);
          }}
          onOfflineStatusChange={(talkId, isOffline) => {
            setOfflineTalks((prev) => {
              const next = new Set(prev);
              if (isOffline) next.add(talkId);
              else next.delete(talkId);
              return next;
            });
          }}
        />
      )}
    </div>
  );
}

// ─── Talk Card ───

function TalkCard({ talk, onPlay, isOffline }: { talk: Talk; onPlay: () => void; isOffline: boolean; onToggleOffline: () => void }) {
  const isExternal = !talk.streamUrl && talk.externalUrl;
  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-3.5 transition-colors"
      style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
    >
      {/* Play button */}
      {isExternal ? (
        <a
          href={talk.externalUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: "color-mix(in oklab, var(--color-accent) 10%, transparent)" }}
          aria-label={`Open ${talk.title} externally`}
        >
          <ExternalLink className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
        </a>
      ) : (
        <button
          onClick={onPlay}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
          style={{ backgroundColor: "color-mix(in oklab, var(--color-accent) 10%, transparent)" }}
          aria-label={`Play ${talk.title}`}
        >
          <Play className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
        </button>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold" style={{ color: "var(--color-ink)" }}>{talk.title}</h3>
        <div className="mt-0.5 flex items-center gap-2">
          {talk.speaker && (
            <span className="truncate text-xs" style={{ color: "var(--color-ink-muted)" }}>{talk.speaker}</span>
          )}
          {talk.duration && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
              <Clock className="h-2.5 w-2.5" /> {formatDuration(talk.duration)}
            </span>
          )}
          {isOffline && (
            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: "color-mix(in oklab, var(--color-success) 10%, transparent)", color: "var(--color-success)" }}>
              Offline
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Audio Player (bottom sheet, background-playback capable) ───

function AudioPlayer({
  talk,
  onClose,
  onNext,
  onOfflineStatusChange,
}: {
  talk: Talk;
  onClose: () => void;
  onNext: () => void;
  onOfflineStatusChange: (talkId: string, isOffline: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Check if this talk is already cached
  useEffect(() => {
    if (!talk.streamUrl || !("caches" in window)) return;
    (async () => {
      try {
        const cache = await caches.open("waqt-v31-audio");
        const cached = await cache.match(talk.streamUrl!);
        if (cached) setIsOffline(true);
      } catch { /* non-critical */ }
    })();
  }, [talk.streamUrl]);

  // Set up Media Session API for background playback controls
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: talk.title,
      artist: talk.speaker || "Unknown speaker",
      album: "Waqt Talks",
    });
    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current?.play();
      navigator.mediaSession.playbackState = "playing";
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
      navigator.mediaSession.playbackState = "paused";
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => onNext());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, [talk, onNext]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => { /* autoplay blocked */ });
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Save for offline use — cache the audio file
  const handleSaveOffline = useCallback(async () => {
    if (!talk.streamUrl || isOffline) return;
    setIsSavingOffline(true);
    try {
      const cache = await caches.open("waqt-v31-audio");
      await cache.add(talk.streamUrl);
      setIsOffline(true);
      onOfflineStatusChange(talk.id, true);
    } catch {
      /* failed to cache */
    } finally {
      setIsSavingOffline(false);
    }
  }, [talk, isOffline, onOfflineStatusChange]);

  // Remove offline copy
  const handleRemoveOffline = useCallback(async () => {
    if (!talk.streamUrl) return;
    try {
      const cache = await caches.open("waqt-v31-audio");
      await cache.delete(talk.streamUrl);
      setIsOffline(false);
      onOfflineStatusChange(talk.id, false);
    } catch { /* non-critical */ }
  }, [talk, onOfflineStatusChange]);

  const skipAmount = 15;
  const skipBack = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skipAmount);
    }
  };
  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + skipAmount);
    }
  };

  return (
    <>
      {/* Hidden audio element — controlled via ref */}
      <audio
        ref={audioRef}
        src={talk.streamUrl || undefined}
        onPlay={() => { setIsPlaying(true); if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing"; }}
        onPause={() => { setIsPlaying(false); if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused"; }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); setIsLoading(false); }}
        onEnded={() => { setIsPlaying(false); onNext(); }}
        autoPlay
        className="hidden"
      />

      {/* Player bar (fixed at bottom) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-paper) 95%, transparent)",
          borderColor: "var(--color-paper-3)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto max-w-2xl px-4 py-3">
          {/* Title row */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: "var(--color-ink)" }}>{talk.title}</p>
              {talk.speaker && (
                <p className="truncate text-xs" style={{ color: "var(--color-ink-muted)" }}>{talk.speaker}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {/* Offline button */}
              {talk.streamUrl && (
                <button
                  onClick={isOffline ? handleRemoveOffline : handleSaveOffline}
                  disabled={isSavingOffline}
                  className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-paper-2)]"
                  style={{ color: isOffline ? "var(--color-success)" : "var(--color-ink-muted)", minHeight: 40, minWidth: 40 }}
                  aria-label={isOffline ? "Remove offline copy" : "Save for offline use"}
                  aria-pressed={isOffline}
                >
                  {isSavingOffline ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-accent)", borderRightColor: "var(--color-accent)" }} />
                  ) : isOffline ? (
                    <Trash2 className="h-4 w-4" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              )}
              {/* Close */}
              <button
                onClick={onClose}
                className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-paper-2)]"
                style={{ color: "var(--color-ink-muted)", minHeight: 40, minWidth: 40 }}
                aria-label="Close player"
              >
                <Pause className="h-4 w-4 hidden" />
                <span className="text-xs font-medium">Close</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2 flex items-center gap-2">
            <span className="w-10 shrink-0 text-right text-[10px] tabular-nums" style={{ color: "var(--color-ink-muted)" }}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full"
              style={{
                backgroundColor: "var(--color-paper-3)",
                accentColor: "var(--color-accent)",
              }}
              aria-label="Seek"
            />
            <span className="w-10 shrink-0 text-[10px] tabular-nums" style={{ color: "var(--color-ink-muted)" }}>
              {isLoading ? "--:--" : formatTime(duration)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={skipBack}
              className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-paper-2)]"
              style={{ color: "var(--color-ink-soft)", minHeight: 40, minWidth: 40 }}
              aria-label="Skip back 15 seconds"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={handlePlayPause}
              className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95"
              style={{ backgroundColor: "var(--color-accent)", color: "var(--color-paper)" }}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
            </button>
            <button
              onClick={skipForward}
              className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-paper-2)]"
              style={{ color: "var(--color-ink-soft)", minHeight: 40, minWidth: 40 }}
              aria-label="Skip forward 15 seconds"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
