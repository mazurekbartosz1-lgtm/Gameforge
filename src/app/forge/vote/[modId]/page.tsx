"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ModConfig } from "@/shared/modConfig";
import ForgeNav from "../../../components/ForgeNav";

interface ModData {
  id: string;
  config: ModConfig;
  status: string;
  votes: number;
  created_at: string;
  players?: { nickname: string };
}

interface VoteStatus {
  voted: boolean;
  count: number;
  weeklyRemaining: number;
}

export default function VotePage() {
  const params = useParams();
  const modId = params?.modId as string;

  const [mod, setMod] = useState<ModData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [voteStatus, setVoteStatus] = useState<VoteStatus>({ voted: false, count: 0, weeklyRemaining: 3 });
  const [voting, setVoting] = useState(false);

  const fetchVoteStatus = (mid: string) =>
    fetch(`/api/forge/vote/${mid}`)
      .then((r) => r.json())
      .then((d) => setVoteStatus(d))
      .catch(() => {});

  useEffect(() => {
    if (!modId) return;
    fetch(`/api/forge/mods/${modId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.mod) {
          setMod(data.mod);
          fetchVoteStatus(modId);
        } else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [modId]);

  async function handleVote() {
    if (voting || voteStatus.voted) return;
    setVoting(true);
    try {
      const res = await fetch("/api/forge/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modId }),
      });
      const data = await res.json();
      if (res.ok) {
        setVoteStatus((prev) => ({ ...prev, voted: true, count: data.votes }));
        if (data.approved && mod) setMod({ ...mod, status: "approved" });
      }
    } finally {
      setVoting(false);
    }
  }

  if (loading) return <Screen><span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, letterSpacing: "0.1em" }}>ŁADOWANIE...</span></Screen>;
  if (notFound || !mod) return <Screen><span style={{ color: "#f87171", fontSize: 13 }}>Mod nie znaleziony.</span></Screen>;

  const author = mod.players?.nickname ?? "Nieznany";
  const date = new Date(mod.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#0b0c1f", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 600, marginBottom: 32 }}>
        <a href="/forge/glosowanie" style={linkStyle}>← Głosowanie</a>
        <ForgeNav active="glosowanie" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <h1 style={{ fontFamily: "var(--font-pixel), 'Press Start 2P', monospace", fontSize: 13, color: "#FF8C00", textTransform: "uppercase", margin: 0, flex: 1, lineHeight: 1.7 }}>
            {mod.config.name}
          </h1>
          <StatusBadge status={mod.status} />
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "6px 0 0", lineHeight: 1.5 }}>
          {mod.config.description}
        </p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "4px 0 0", letterSpacing: "0.06em" }}>
          Autor: {author} · {date}
        </p>
      </div>

      {/* Mod details card */}
      <div style={{
        width: "100%", maxWidth: 600,
        background: "rgba(28,29,54,0.8)", border: "1px solid rgba(255,140,0,0.15)",
        borderTop: "2px solid #FF8C00", borderRadius: 4, padding: 24,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {/* Monster variants */}
        {mod.config.monsterVariants?.length > 0 && (
          <Section title="Nowi wrogowie">
            {mod.config.monsterVariants.map((v) => (
              <Row key={v.id}>
                <ColorDot tint={v.tint} />
                <span style={{ color: "#fff", fontSize: 13 }}>{v.name}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  HP {v.hp} · dmg {v.damage}{v.particleEffect ? ` · ${v.particleEffect}` : ""}
                </span>
              </Row>
            ))}
          </Section>
        )}

        {/* Food variants */}
        {mod.config.foodVariants?.length > 0 && (
          <Section title="Zmienione jedzenie">
            {mod.config.foodVariants.map((f) => (
              <Row key={f.id}>
                <span style={{ color: "#fff", fontSize: 13 }}>{f.id}</span>
                {f.hungerRestore !== undefined && <Chip>głód {f.hungerRestore > 0 ? "+" : ""}{f.hungerRestore}</Chip>}
                {f.hpRestore !== undefined && <Chip>HP {f.hpRestore > 0 ? "+" : ""}{f.hpRestore}</Chip>}
              </Row>
            ))}
          </Section>
        )}

        {/* Rules */}
        {mod.config.rules?.length > 0 && (
          <Section title="Nowe zasady">
            {mod.config.rules.map((r) => (
              <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Chip>{formatTrigger(r.trigger, r.intervalMs)}</Chip>
                <div style={{ paddingLeft: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                  {r.effects.map((e, i) => (
                    <span key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
                      → {formatEffect(e)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Vote button */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            onClick={handleVote}
            disabled={voteStatus.voted || voting || mod.status === "approved"}
            style={voteStatus.voted || mod.status === "approved" ? votedBtnStyle : activeBtnStyle}
          >
            {voteStatus.voted ? "✓ Zagłosowano" : voting ? "..." : "❤ Zagłosuj"}
          </button>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>
            {voteStatus.count} {voteStatus.count === 1 ? "głos" : "głosy"}
            {!voteStatus.voted && voteStatus.weeklyRemaining > 0 && (
              <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: 8 }}>
                · {voteStatus.weeklyRemaining} pozostałe w tym tygodniu
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100vh", background: "#0b0c1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { text: string; color: string }> = {
    submitted: { text: "W głosowaniu", color: "#00e3fd" },
    pending:   { text: "Oczekuje",     color: "#FF8C00" },
    approved:  { text: "Zatwierdzony", color: "#4ade80" },
    rejected:  { text: "Odrzucony",    color: "#f87171" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: s.color, border: `1px solid ${s.color}40`, padding: "3px 8px", borderRadius: 2 }}>
      {s.text}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,140,0,0.6)", margin: "0 0 8px" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,140,0,0.12)", border: "1px solid rgba(255,140,0,0.25)", borderRadius: 2, color: "#FF8C00", fontWeight: 600 }}>
      {children}
    </span>
  );
}

function ColorDot({ tint }: { tint: number }) {
  const hex = "#" + tint.toString(16).padStart(6, "0");
  return <span style={{ width: 12, height: 12, borderRadius: "50%", background: hex, display: "inline-block", flexShrink: 0, border: "1px solid rgba(255,255,255,0.2)" }} />;
}

function formatTrigger(trigger: string, intervalMs?: number): string {
  if (trigger === "on_tick") return "Co sekundę";
  if (trigger === "every_Ns" && intervalMs) {
    const min = intervalMs / 60000;
    return min >= 1 ? `Co ${Math.round(min)} min` : `Co ${Math.round(intervalMs / 1000)}s`;
  }
  if (trigger === "on_eat") return "Gdy gracz je";
  if (trigger === "on_hunger_low") return "Gdy gracz jest głodny";
  if (trigger === "on_enemy_death") return "Gdy wróg ginie";
  if (trigger === "on_player_join") return "Gdy dołącza gracz";
  return trigger;
}

function formatEffect(e: { action: string; field?: string; value?: string | number; pool?: string[]; qty?: number; target?: string }): string {
  const who = e.target === "all_players" ? "wszyscy gracze" : "gracz";
  if (e.action === "broadcast_message") return `💬 "${e.value}"`;
  if (e.action === "spawn_enemy") return `Pojawia się wróg: ${e.value}${e.qty && e.qty > 1 ? ` ×${e.qty}` : ""}`;
  if (e.action === "set_weather") return `Pogoda: ${e.value}`;
  if (e.action === "modify_stat") return `${who}: ${e.field} ${Number(e.value) > 0 ? "+" : ""}${e.value}`;
  if (e.action === "add_item") return `${who} dostaje: ${e.pool ? e.pool.join("/") : e.field}${e.qty && e.qty > 1 ? ` ×${e.qty}` : ""}`;
  return e.action;
}

const linkStyle: React.CSSProperties = {
  fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "rgba(255,140,0,0.5)", textDecoration: "none", fontWeight: 700,
};

const activeBtnStyle: React.CSSProperties = {
  padding: "10px 24px", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", cursor: "pointer",
  border: "1px solid #FF8C00", background: "rgba(255,140,0,0.15)",
  color: "#FF8C00", borderRadius: 4,
};

const votedBtnStyle: React.CSSProperties = {
  padding: "10px 24px", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", cursor: "default",
  border: "1px solid rgba(74,222,128,0.4)", background: "rgba(74,222,128,0.08)",
  color: "#4ade80", borderRadius: 4,
};
