"use client";

import { useEffect, useRef, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";

type Stats = {
  hp: number;
  maxHp: number;
  hunger: number;
  sanity: number;
  attack: number;
  defense: number;
  nickname: string;
  isNight: boolean;
};

type Position = { x: number; y: number };

const S = {
  display: "var(--font-display), 'Space Grotesk', sans-serif",
  body: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
      color: "#a9a9c2",
      fontSize: 8,
      textTransform: "uppercase",
      letterSpacing: "0.18em",
      fontWeight: 700,
    }}>
      {children}
    </span>
  );
}

function StatBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: S.body, color: "#a9a9c2", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
          {label}
        </span>
        <span style={{ fontFamily: S.display, color: "#a9a9c2", fontSize: 9, fontWeight: 600 }}>
          {Math.floor(value)}<span style={{ color: "#46465b" }}>/{max}</span>
        </span>
      </div>
      <div style={{ height: 6, background: "#16172e", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function CombatTile({
  label, value, accentColor, dimColor, warning,
}: {
  label: string; value: number; accentColor: string; dimColor: string; warning?: React.ReactNode;
}) {
  return (
    <div style={{
      flex: 1,
      background: "#0e0f22",
      borderTop: `2px solid ${accentColor}`,
      borderRight: `2px solid ${accentColor}`,
      borderBottom: `1px solid ${dimColor}`,
      borderLeft: `1px solid ${dimColor}`,
      padding: "8px 6px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2,
    }}>
      <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontFamily: S.display, fontSize: 20, fontWeight: 900, color: accentColor, lineHeight: 1 }}>{value}</span>
      {warning}
    </div>
  );
}

function EquipSlot({ symbol, color, label }: { symbol: string; color: string; label: string }) {
  return (
    <div
      title={label}
      style={{
        aspectRatio: "1",
        background: "#16172e",
        border: "1px solid #22233e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 18, color, lineHeight: 1, userSelect: "none" }}>{symbol}</span>
    </div>
  );
}

export default function PlayerPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 });
  const dayRef = useRef(1);
  const prevIsNightRef = useRef<boolean | null>(null);
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  useEffect(() => {
    const onStats = (e: Event) => {
      const data = (e as CustomEvent<Stats>).detail;
      // Increment day on night→day transition
      if (prevIsNightRef.current === true && !data.isNight) dayRef.current += 1;
      prevIsNightRef.current = data.isNight;
      setStats(data);
    };
    const onPos = (e: Event) => setPos((e as CustomEvent<Position>).detail);
    window.addEventListener("gameStats", onStats);
    window.addEventListener("gamePosition", onPos);
    return () => {
      window.removeEventListener("gameStats", onStats);
      window.removeEventListener("gamePosition", onPos);
    };
  }, []);

  const clerkName = isLoaded && isSignedIn
    ? user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
      : user?.emailAddresses[0]?.emailAddress ?? "Gracz"
    : null;

  const displayName = (clerkName ?? stats?.nickname ?? "Guest").toUpperCase();
  const isGuest = isLoaded && !isSignedIn;
  const sanityLow = (stats?.sanity ?? 100) <= 0;
  const day = dayRef.current;

  return (
    <div style={{
      width: 216,
      flexShrink: 0,
      height: "100%",
      background: "#0b0c1f",
      borderTop: "2px solid #FF8C00",
      borderLeft: "2px solid #16172e",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      overflowX: "hidden",
    }}>

      {/* ── OPERATOR header ── */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #16172e" }}>
        <div style={{ fontFamily: S.body, color: "#46465b", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.22em", marginBottom: 4 }}>
          OPERATOR
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontFamily: S.display,
            color: "#e4e3fe",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 110,
          }}>
            {displayName}
          </span>
          {stats != null && (
            <span style={{ fontFamily: S.body, fontSize: 9, color: "#FF8C00", fontWeight: 700, whiteSpace: "nowrap" }}>
              {stats.isNight ? `NIGHT ${day} 🌙` : `DAY ${day} ☀`}
            </span>
          )}
        </div>
        {isGuest && (
          <button
            onClick={() => openSignIn()}
            style={{
              marginTop: 8,
              width: "100%",
              fontFamily: S.display,
              fontSize: 9,
              fontWeight: 700,
              color: "#2a1600",
              background: "linear-gradient(to right, #FF8C00, #CC7000)",
              border: "none",
              padding: "5px 0",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            SIGN IN
          </button>
        )}
      </div>

      {/* ── TACTICAL_MAP (minimap) ── */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #16172e" }}>
        <SectionLabel>TACTICAL_MAP</SectionLabel>
        <div style={{ marginTop: 6, border: "1px solid rgba(255,140,0,0.25)", background: "#000", lineHeight: 0 }}>
          <canvas
            id="minimap-canvas"
            width={160}
            height={120}
            style={{ width: "100%", display: "block", imageRendering: "pixelated" }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontFamily: S.display, color: "#46465b", fontSize: 8 }}>X {pos.x}</span>
          <span style={{ fontFamily: S.display, color: "#46465b", fontSize: 8 }}>Y {pos.y}</span>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #16172e", display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel>STATS</SectionLabel>
        <StatBar label="HP"     value={stats?.hp     ?? 100} max={stats?.maxHp ?? 100} color="#f87171" />
        <StatBar label="HUNGER" value={stats?.hunger  ?? 100} max={100}                color="#fb923c" />
        <StatBar label="SANITY" value={stats?.sanity  ?? 100} max={100}                color="#a78bfa" />
      </div>

      {/* ── COMBAT ── */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #16172e", display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel>COMBAT</SectionLabel>
        <div style={{ display: "flex", gap: 6 }}>
          <CombatTile
            label="ATAK"
            value={stats?.attack ?? 5}
            accentColor={sanityLow ? "#f87171" : "#FF8C00"}
            dimColor={sanityLow ? "rgba(248,113,113,0.15)" : "rgba(255,140,0,0.15)"}
            warning={sanityLow
              ? <span style={{ fontFamily: S.body, color: "#f87171", fontSize: 7, textTransform: "uppercase" }}>↓ LOW</span>
              : undefined}
          />
          <CombatTile
            label="OBRONA"
            value={stats?.defense ?? 2}
            accentColor="#00e3fd"
            dimColor="rgba(0,227,253,0.15)"
          />
        </div>
      </div>

      {/* ── EQUIPMENT ── */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #16172e", display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel>EQUIPMENT</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <EquipSlot symbol="✕" color="#FF8C00"  label="Weapon" />
          <EquipSlot symbol="◆" color="#00e3fd"  label="Armor"  />
          <EquipSlot symbol="◉" color="#f183ff"  label="Helmet" />
          <EquipSlot symbol="+" color="#46465b"  label="Item"   />
        </div>
      </div>

      {/* ── QUEST_OBJ ── */}
      <div style={{ padding: "8px 12px", marginTop: "auto" }}>
        <SectionLabel>QUEST_OBJ</SectionLabel>
        <div style={{ marginTop: 6, height: 2, background: "#16172e", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "50%", background: "linear-gradient(to right, #FF8C00, #00e3fd, #f183ff)" }} />
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <span style={{ color: "#FF8C00", fontSize: 10 }}>★</span>
          <span style={{ color: "#FF8C00", fontSize: 10 }}>★</span>
          <span style={{ color: "#46465b",  fontSize: 10 }}>☆</span>
        </div>
      </div>

    </div>
  );
}
