"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import NotificationBell from "../components/NotificationBell";

const S = {
  display: "var(--font-display), 'Space Grotesk', sans-serif",
  body: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
  pixel: "var(--font-pixel), 'Press Start 2P', monospace",
};

type RoomInfo = { playerCount: number; roomId: string };
type Stats = {
  isNight: boolean;
  worldTime: number;
  groupAgeDays?: number;
  difficultyLevel?: number;
  difficultyName?: string;
  difficultyColor?: string;
  daysToNextLevel?: number;
};

function DifficultyBadge({ stats }: { stats: Stats }) {
  const name = stats.difficultyName ?? "Spokojnie";
  const color = stats.difficultyColor ?? "#4caf50";
  const days = stats.groupAgeDays ?? 0;
  const daysToNext = stats.daysToNextLevel ?? 0;
  // Progress within current level — show days since level start
  // We can't know exact minDay here so show day counter + daysToNext
  const hasNext = daysToNext > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 180 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: S.pixel, fontSize: 9, color, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          ⚠ {name}
        </span>
        <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 9 }}>
          Dzień {days}
        </span>
        {hasNext && (
          <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 9 }}>
            · ↑ za {daysToNext}d
          </span>
        )}
      </div>
      {hasNext && (
        <div style={{ width: "100%", height: 3, background: "#16172e", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            background: color,
            // Progress: we don't know exact level start, show as fraction of daysToNext
            // Use a rough animation placeholder — actual value isn't calculable client-side
            width: `${Math.min(100, (1 - daysToNext / 7) * 100)}%`,
            transition: "width 2s linear",
          }} />
        </div>
      )}
    </div>
  );
}

interface ApprovedMod {
  id: string;
  config: { name: string; description: string; monsterVariants?: { tint: number; name: string }[] };
  votes: number;
  players?: { nickname: string };
}

// 1 day = 4h real = 0–1 worldTime. Day = 0–0.5, Night = 0.5–1
// Phase progress: how far into current phase (0–1)
function phaseProgress(worldTime: number): number {
  return worldTime < 0.5 ? worldTime / 0.5 : (worldTime - 0.5) / 0.5;
}

function formatTimeRemaining(worldTime: number): string {
  const DAY_MS = 14_400_000;
  const phaseMs = DAY_MS / 2; // 2h per phase
  const elapsed = worldTime < 0.5 ? worldTime * DAY_MS : (worldTime - 0.5) * DAY_MS;
  const remaining = Math.max(0, phaseMs - elapsed);
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function GameHeader() {
  const searchParams = useSearchParams();
  const groupName = searchParams.get("groupName");
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [day, setDay] = useState(1);
  const prevIsNightRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Save last game URL so forge pages can link back
    if (typeof window !== "undefined") {
      localStorage.setItem("lastGameUrl", window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const onRoomInfo = (e: Event) => setRoomInfo((e as CustomEvent<RoomInfo>).detail);
    const onStats = (e: Event) => {
      const data = (e as CustomEvent<Stats>).detail;
      setStats(data);
      if (prevIsNightRef.current === true && !data.isNight) {
        setDay((d) => d + 1);
      }
      prevIsNightRef.current = data.isNight;
    };
    window.addEventListener("gameRoomInfo", onRoomInfo);
    window.addEventListener("gameStats", onStats);
    return () => {
      window.removeEventListener("gameRoomInfo", onRoomInfo);
      window.removeEventListener("gameStats", onStats);
    };
  }, []);

  const [modsOpen, setModsOpen] = useState(false);
  const [approvedMods, setApprovedMods] = useState<ApprovedMod[]>([]);
  const [modsLoading, setModsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingModId, setDeletingModId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setIsAdmin(d.isAdmin ?? false)).catch(() => {});
  }, []);

  function openMods() {
    setModsOpen(true);
    const gId = searchParams.get("groupId");
    const url = gId ? `/api/forge/mods/approved?groupId=${gId}` : "/api/forge/mods/approved";
    setModsLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => setApprovedMods(d.mods ?? []))
      .finally(() => setModsLoading(false));
  }

  async function handleDeleteMod(modId: string) {
    setDeletingModId(modId);
    await fetch("/api/forge/mods", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: modId }),
    });
    setApprovedMods((prev) => prev.filter((m) => m.id !== modId));
    setDeletingModId(null);
  }

  const isNight = stats?.isNight ?? false;
  const wt = stats?.worldTime ?? 0;
  const progress = phaseProgress(wt);
  const isTestMode = searchParams.get("mode") === "test";
  const roomLabel = isTestMode
    ? "TRYB TESTOWY"
    : (groupName ?? (roomInfo ? `#${roomInfo.roomId.slice(0, 8).toUpperCase()}` : "—"));

  return (
    <>
    {isTestMode && (
      <div style={{
        height: 28, flexShrink: 0,
        background: "rgba(255,140,0,0.12)", borderBottom: "1px solid rgba(255,140,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <span style={{ fontSize: 11, fontFamily: S.display, color: "#FF8C00", letterSpacing: "0.1em", fontWeight: 700, textTransform: "uppercase" }}>
          🧪 TRYB TESTOWY — modyfikacje aktywne. Nie zapisano do grupy.
        </span>
      </div>
    )}
    <div style={{
      height: 44,
      flexShrink: 0,
      background: "#0b0c1f",
      borderBottom: "2px solid #16172e",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      gap: 12,
      zIndex: 100,
    }}>

      {/* LEFT — room info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
          <span style={{ fontFamily: S.pixel, color: "#46465b", fontSize: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            POKÓJ
          </span>
          <span style={{
            fontFamily: "var(--font-pixel), 'Press Start 2P', monospace", color: "#e4e3fe", fontSize: 9,
            textTransform: "uppercase", letterSpacing: "0.05em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180,
          }}>
            {roomLabel}
          </span>
        </div>
        {roomInfo && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(0,227,253,0.08)",
            border: "1px solid rgba(0,227,253,0.2)",
            padding: "3px 8px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e3fd", flexShrink: 0, boxShadow: "0 0 4px #00e3fd" }} />
            <span style={{ fontFamily: S.pixel, color: "#00e3fd", fontSize: 9 }}>
              {roomInfo.playerCount}
            </span>
            <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              online
            </span>
          </div>
        )}
      </div>

      {/* CENTER-LEFT — difficulty badge */}
      {stats && (stats.difficultyName || stats.groupAgeDays !== undefined) && (
        <DifficultyBadge stats={stats} />
      )}

      {/* CENTER — day/night cycle */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1, maxWidth: 280 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>{isNight ? "🌙" : "☀"}</span>
          <span style={{
            fontFamily: S.pixel, fontSize: 9,
            color: isNight ? "#a78bfa" : "#FF8C00",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {isNight ? "NOC" : "DZIEŃ"} {day}
          </span>
          {stats && (
            <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 9, letterSpacing: "0.08em" }}>
              ({formatTimeRemaining(wt)} do {isNight ? "świtu" : "nocy"})
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div style={{ width: "100%", height: 3, background: "#16172e", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: isNight
              ? "linear-gradient(to right, #4c1d95, #a78bfa)"
              : "linear-gradient(to right, #FF8C00, #FFD700)",
            transition: "width 2s linear",
          }} />
        </div>
      </div>

      {/* RIGHT — historia + moje mody + dzwonek + leave */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
      <NotificationBell />
      <button
        onClick={openMods}
        style={{
          fontFamily: S.pixel, fontSize: 8, letterSpacing: "0.05em",
          textTransform: "uppercase", color: "#4ade80", textDecoration: "none",
          border: "1px solid rgba(74,222,128,0.3)", padding: "5px 10px", whiteSpace: "nowrap",
          background: "transparent", cursor: "pointer", opacity: 0.9,
        }}
      >
        AKTYWNE MODY
      </button>
      <a
        href={(() => {
          const gId = searchParams.get("groupId");
          return gId ? `/forge/moje-mody?groupId=${gId}` : "/forge/moje-mody";
        })()}
        style={{
          fontFamily: S.pixel, fontSize: 8, letterSpacing: "0.05em",
          textTransform: "uppercase", color: "#FF8C00", textDecoration: "none",
          border: "1px solid rgba(255,140,0,0.3)", padding: "5px 10px", whiteSpace: "nowrap",
          opacity: 0.8,
        }}
      >
        MOJE MODY
      </a>
      <a
        href={(() => {
          const gId = searchParams.get("groupId");
          const gName = searchParams.get("groupName");
          if (!gId) return "/room-history";
          return `/room-history?groupId=${gId}${gName ? `&groupName=${gName}` : ""}`;
        })()}
        style={{
          fontFamily: S.pixel, fontSize: 8, letterSpacing: "0.05em",
          textTransform: "uppercase", color: "rgba(169,169,194,0.5)", textDecoration: "none",
          border: "1px solid rgba(169,169,194,0.15)", padding: "5px 10px", whiteSpace: "nowrap",
        }}
      >
        HISTORIA
      </a>
      <a
        href="/"
        style={{
          fontFamily: S.pixel,
          fontSize: 8,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(169,169,194,0.6)",
          textDecoration: "none",
          border: "1px solid rgba(169,169,194,0.2)",
          padding: "5px 12px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "color 0.1s, border-color 0.1s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "#f87171";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(248,113,113,0.4)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(169,169,194,0.6)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(169,169,194,0.2)";
        }}
      >
        ← OPUŚĆ POKÓJ
      </a>
      </div>
    </div>
      {modsOpen && (
        <div
          onClick={() => setModsOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0b0c1f", border: "1px solid rgba(74,222,128,0.25)",
              borderTop: "2px solid #4ade80", borderRadius: 4,
              width: "100%", maxWidth: 520, maxHeight: "80vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: S.pixel, fontSize: 11, color: "#4ade80", letterSpacing: "0.1em" }}>
                AKTYWNE MODY
              </span>
              <button
                onClick={() => setModsOpen(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div style={{ overflowY: "auto", padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {modsLoading && (
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, letterSpacing: "0.1em", textAlign: "center", padding: 24 }}>ŁADOWANIE...</span>
              )}
              {!modsLoading && approvedMods.length === 0 && (
                <div style={{ textAlign: "center", padding: 32 }}>
                  <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, letterSpacing: "0.06em", margin: 0 }}>
                    Brak aktywnych modów w tej grupie.
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, margin: "8px 0 0" }}>
                    Zagłosuj na mod w zakładce Głosowanie, żeby go aktywować.
                  </p>
                </div>
              )}
              {!modsLoading && approvedMods.map((mod) => {
                const gId = searchParams.get("groupId");
                const voteLink = gId
                  ? `/forge/vote/${mod.id}?groupId=${gId}`
                  : `/forge/vote/${mod.id}`;
                const tint = mod.config.monsterVariants?.[0]?.tint;
                const tintHex = tint !== undefined ? "#" + tint.toString(16).padStart(6, "0") : null;
                return (
                  <div key={mod.id} style={{
                    background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.12)",
                    borderRadius: 4, padding: "12px 14px",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {tintHex && (
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: tintHex, flexShrink: 0, border: "1px solid rgba(255,255,255,0.15)" }} />
                      )}
                      <span style={{ fontFamily: S.pixel, fontSize: 9, color: "#4ade80", letterSpacing: "0.05em", lineHeight: 1.6, flex: 1 }}>
                        {mod.config.name}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>
                        ❤ {mod.votes}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteMod(mod.id)}
                          disabled={deletingModId === mod.id}
                          style={{ background: "none", border: "none", color: "rgba(248,113,113,0.5)", fontSize: 13, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
                          title="Usuń mod (admin)"
                        >
                          {deletingModId === mod.id ? "..." : "✕"}
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 }}>
                      {mod.config.description}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>
                        autor: {mod.players?.nickname ?? "?"}
                      </span>
                      <a
                        href={voteLink}
                        style={{ fontSize: 10, color: "#FF8C00", letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700 }}
                      >
                        Zobacz →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer link to full vote list */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 20px", display: "flex", justifyContent: "flex-end" }}>
              <a
                href={(() => {
                  const gId = searchParams.get("groupId");
                  return gId ? `/forge/glosowanie?groupId=${gId}` : "/forge/glosowanie";
                })()}
                style={{ fontFamily: S.pixel, fontSize: 8, color: "#FF8C00", textDecoration: "none", letterSpacing: "0.08em", opacity: 0.8 }}
              >
                WSZYSTKIE GŁOSOWANIA →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
