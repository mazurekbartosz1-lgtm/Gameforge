"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const S = {
  display: "var(--font-display), 'Space Grotesk', sans-serif",
  body: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
};

type RoomInfo = { playerCount: number; roomId: string };
type Stats = { isNight: boolean; worldTime: number };

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

  const isNight = stats?.isNight ?? false;
  const wt = stats?.worldTime ?? 0;
  const progress = phaseProgress(wt);
  const roomLabel = groupName ?? (roomInfo ? `#${roomInfo.roomId.slice(0, 8).toUpperCase()}` : "—");

  return (
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
          <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.2em" }}>
            POKÓJ
          </span>
          <span style={{
            fontFamily: S.display, color: "#e4e3fe", fontSize: 12, fontWeight: 700,
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
            <span style={{ fontFamily: S.display, color: "#00e3fd", fontSize: 12, fontWeight: 900 }}>
              {roomInfo.playerCount}
            </span>
            <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              online
            </span>
          </div>
        )}
      </div>

      {/* CENTER — day/night cycle */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1, maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>{isNight ? "🌙" : "☀"}</span>
          <span style={{
            fontFamily: S.display, fontWeight: 900, fontSize: 11,
            color: isNight ? "#a78bfa" : "#FF8C00",
            letterSpacing: "0.12em", textTransform: "uppercase",
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

      {/* RIGHT — historia + moje mody + leave */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
      <a
        href="/forge/moje-mody"
        style={{
          fontFamily: S.display, fontWeight: 700, fontSize: 10, letterSpacing: "0.08em",
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
          fontFamily: S.display, fontWeight: 700, fontSize: 10, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "rgba(169,169,194,0.5)", textDecoration: "none",
          border: "1px solid rgba(169,169,194,0.15)", padding: "5px 10px", whiteSpace: "nowrap",
        }}
      >
        HISTORIA
      </a>
      <a
        href="/"
        style={{
          fontFamily: S.display,
          fontWeight: 900,
          fontSize: 10,
          letterSpacing: "0.1em",
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
  );
}
