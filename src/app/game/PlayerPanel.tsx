"use client";

import { useEffect, useRef, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { getRoom } from "./network/ColyseusClient";

type Stats = {
  hp: number;
  maxHp: number;
  hunger: number;
  sanity: number;
  attack: number;
  defense: number;
  nickname: string;
  isNight: boolean;
  equipment?: Record<string, string>;
};

// Loot bonuses mirrored from server lootConfig (client-side read-only)
const LOOT_INFO: Record<string, { name: string; attackBonus: number; defenseBonus: number; rarity: string }> = {
  bone_sword:    { name: "Bone Sword",    attackBonus: 8,  defenseBonus: 0,  rarity: "common"   },
  iron_sword:    { name: "Iron Sword",    attackBonus: 15, defenseBonus: 0,  rarity: "uncommon" },
  shadow_blade:  { name: "Shadow Blade",  attackBonus: 25, defenseBonus: 0,  rarity: "rare"     },
  leather_armor: { name: "Leather Armor", attackBonus: 0,  defenseBonus: 5,  rarity: "common"   },
  chain_mail:    { name: "Chain Mail",    attackBonus: 0,  defenseBonus: 10, rarity: "uncommon" },
  bone_helmet:   { name: "Bone Helmet",   attackBonus: 0,  defenseBonus: 3,  rarity: "common"   },
  iron_helmet:   { name: "Iron Helmet",   attackBonus: 0,  defenseBonus: 7,  rarity: "uncommon" },
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
      <div style={{ height: 4, background: "#16172e", overflow: "hidden" }}>
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
      padding: "6px 4px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2,
    }}>
      <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontFamily: S.display, fontSize: 16, fontWeight: 900, color: accentColor, lineHeight: 1 }}>{value}</span>
      {warning}
    </div>
  );
}

function EquipSlot({
  symbol, color, label, slot, equippedId,
}: {
  symbol: string; color: string; label: string; slot: string; equippedId?: string;
}) {
  const info = equippedId ? LOOT_INFO[equippedId] : null;
  const rarityColor = info?.rarity === "rare" ? "#FFD700" : info?.rarity === "uncommon" ? "#44ff88" : "#e4e3fe";

  function handleUnequip() {
    if (!equippedId) return;
    const room = getRoom();
    if (room) room.send("unequip_item", { slot });
  }

  return (
    <div
      title={info ? `${info.name} — click to unequip` : label}
      onClick={handleUnequip}
      style={{
        aspectRatio: "1",
        background: info ? "#12132a" : "#16172e",
        border: info ? `1px solid ${rarityColor}44` : "1px solid #22233e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: info ? "pointer" : "default",
        padding: 2,
        gap: 1,
      }}
    >
      {info ? (
        <>
          <span style={{ fontSize: 13, color: rarityColor, lineHeight: 1, userSelect: "none" }}>{symbol}</span>
          <span style={{ fontSize: 7, color: rarityColor, lineHeight: 1, textAlign: "center", userSelect: "none", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {info.name}
          </span>
          <span style={{ fontSize: 7, color: "#46465b", lineHeight: 1, userSelect: "none" }}>
            {info.attackBonus > 0 ? `+${info.attackBonus} ATK` : `+${info.defenseBonus} DEF`}
          </span>
        </>
      ) : (
        <span style={{ fontSize: 14, color, lineHeight: 1, userSelect: "none" }}>{symbol}</span>
      )}
    </div>
  );
}

export default function PlayerPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 });
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const searchParams = useSearchParams();
  const groupName = searchParams.get("groupName");

  useEffect(() => {
    const onStats = (e: Event) => setStats((e as CustomEvent<Stats>).detail);
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
      overflow: "hidden",
    }}>

      {/* ── OPERATOR header ── */}
      <div style={{ padding: "7px 10px", borderBottom: "1px solid #16172e" }}>
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
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #16172e" }}>
        <SectionLabel>TACTICAL_MAP</SectionLabel>
        <div style={{ marginTop: 4, border: "1px solid rgba(255,140,0,0.25)", background: "#000", lineHeight: 0 }}>
          <canvas
            id="minimap-canvas"
            width={160}
            height={100}
            style={{ width: "100%", display: "block", imageRendering: "pixelated" }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          <span style={{ fontFamily: S.display, color: "#46465b", fontSize: 7 }}>X {pos.x}</span>
          <span style={{ fontFamily: S.display, color: "#46465b", fontSize: 7 }}>Y {pos.y}</span>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #16172e", display: "flex", flexDirection: "column", gap: 5 }}>
        <SectionLabel>STATS</SectionLabel>
        <StatBar label="HP"     value={stats?.hp     ?? 100} max={stats?.maxHp ?? 100} color="#f87171" />
        <StatBar label="HUNGER" value={stats?.hunger  ?? 100} max={100}                color="#fb923c" />
        <StatBar label="SANITY" value={stats?.sanity  ?? 100} max={100}                color="#a78bfa" />
      </div>

      {/* ── COMBAT ── */}
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #16172e", display: "flex", flexDirection: "column", gap: 5 }}>
        <SectionLabel>COMBAT</SectionLabel>
        <div style={{ display: "flex", gap: 5 }}>
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
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #16172e", display: "flex", flexDirection: "column", gap: 5 }}>
        <SectionLabel>EQUIPMENT</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          <EquipSlot symbol="✕" color="#FF8C00" label="Weapon" slot="weapon" equippedId={stats?.equipment?.weapon} />
          <EquipSlot symbol="◆" color="#00e3fd" label="Armor"  slot="armor"  equippedId={stats?.equipment?.armor}  />
          <EquipSlot symbol="◉" color="#f183ff" label="Helmet" slot="helmet" equippedId={stats?.equipment?.helmet} />
          <EquipSlot symbol="+" color="#46465b" label="Item"   slot="item"   equippedId={stats?.equipment?.item}   />
        </div>
      </div>

      {/* ── QUEST_OBJ ── */}
      <div style={{ padding: "6px 10px" }}>
        <SectionLabel>QUEST_OBJ</SectionLabel>
        <div style={{ marginTop: 4, height: 2, background: "#16172e", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "50%", background: "linear-gradient(to right, #FF8C00, #00e3fd, #f183ff)" }} />
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
          <span style={{ color: "#FF8C00", fontSize: 9 }}>★</span>
          <span style={{ color: "#FF8C00", fontSize: 9 }}>★</span>
          <span style={{ color: "#46465b",  fontSize: 9 }}>☆</span>
        </div>
      </div>

    </div>
  );
}
