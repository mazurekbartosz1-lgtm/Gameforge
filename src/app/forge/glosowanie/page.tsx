"use client";

import { useEffect, useState } from "react";
import type { ModConfig } from "@/shared/modConfig";
import ForgeNav from "../../components/ForgeNav";
import { useLastGameUrl } from "../../hooks/useLastGameUrl";

interface SubmittedMod {
  id: string;
  config: ModConfig;
  status: string;
  votes: number;
  created_at: string;
  players?: { nickname: string };
}

const MAX_HEARTS = 3;

export default function GlosowaniePage() {
  const groupId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("groupId") : null;

  const lastGameUrl = useLastGameUrl();
  const [mods, setMods] = useState<SubmittedMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [weeklyRemaining, setWeeklyRemaining] = useState<number | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    const qs = groupId ? `?groupId=${groupId}` : "";
    Promise.all([
      fetch(`/api/forge/mods/submitted${qs}`).then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()).catch(() => ({ isAdmin: false })),
      fetch("/api/forge/votes/remaining").then((r) => r.json()).catch(() => ({ weeklyRemaining: MAX_HEARTS })),
    ]).then(([modsData, meData, remainingData]) => {
      const loadedMods: SubmittedMod[] = modsData.mods ?? [];
      setMods(loadedMods);
      setIsAdmin(meData.isAdmin ?? false);
      setWeeklyRemaining(remainingData.weeklyRemaining ?? MAX_HEARTS);
      // Fetch per-mod vote status in parallel
      Promise.all(
        loadedMods.map((m) =>
          fetch(`/api/forge/vote/${m.id}`).then((r) => r.json()).catch(() => ({ voted: false }))
        )
      ).then((statuses) => {
        const voted = new Set<string>();
        statuses.forEach((s, i) => { if (s.voted) voted.add(loadedMods[i].id); });
        setVotedIds(voted);
      });
    }).finally(() => setLoading(false));
  }, []);

  async function handleVote(e: React.MouseEvent, modId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (votingId || votedIds.has(modId) || weeklyRemaining === 0) return;
    setVotingId(modId);
    try {
      const res = await fetch("/api/forge/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modId }),
      });
      const data = await res.json();
      if (res.ok) {
        setVotedIds((prev) => new Set([...prev, modId]));
        setWeeklyRemaining((prev) => Math.max(0, (prev ?? 1) - 1));
        setMods((prev) => prev.map((m) => m.id === modId ? { ...m, votes: data.votes } : m));
        if (data.approved) {
          setMods((prev) => prev.map((m) => m.id === modId ? { ...m, status: "approved" } : m));
        }
      }
    } finally {
      setVotingId(null);
    }
  }

  async function handleAdminDelete(modId: string) {
    if (!confirm("Usunąć ten mod?")) return;
    setDeletingId(modId);
    await fetch("/api/forge/mods", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: modId }),
    });
    setMods((prev) => prev.filter((m) => m.id !== modId));
    setDeletingId(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0c1f", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px" }}>
      <div style={{ width: "100%", maxWidth: 600, marginBottom: 32 }}>
        <a href={lastGameUrl} style={backLinkStyle}>← Gameforge</a>
        <h1 style={{ fontFamily: "var(--font-pixel), 'Press Start 2P', monospace", fontSize: 13, color: "#FF8C00", textTransform: "uppercase", marginTop: 16, marginBottom: 8, lineHeight: 1.7, letterSpacing: "0.03em" }}>
          Voting
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", margin: 0 }}>
          Mody zgłoszone przez graczy do głosowania{groupId ? " w twojej grupie" : ""}.
        </p>

        {/* Weekly hearts */}
        {weeklyRemaining !== null && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, padding: "10px 14px" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Głosy w tym tygodniu
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                <span key={i} style={{ fontSize: 16, lineHeight: 1, opacity: i < weeklyRemaining ? 1 : 0.2 }}>❤</span>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
              {weeklyRemaining}/{MAX_HEARTS} pozostało
            </span>
          </div>
        )}

        <ForgeNav groupId={groupId} active="glosowanie" />
      </div>

      {loading && (
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, letterSpacing: "0.1em" }}>
          ŁADOWANIE...
        </div>
      )}

      {!loading && mods.length === 0 && (
        <div style={{
          width: "100%", maxWidth: 600,
          background: "rgba(28,29,54,0.8)", border: "1px solid rgba(255,140,0,0.1)",
          borderRadius: 4, padding: 32, textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Brak modów zgłoszonych do głosowania.
          </p>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: 12 }}>
        {mods.map((mod) => {
          const author = mod.players?.nickname ?? "Nieznany";
          const date = new Date(mod.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
          const voteHref = `/forge/vote/${mod.id}${groupId ? `?groupId=${groupId}` : ""}`;
          const voted = votedIds.has(mod.id);
          const canVote = !voted && (weeklyRemaining ?? 0) > 0 && !votingId;
          const isApproved = mod.status === "approved";

          return (
            <div key={mod.id} style={{ position: "relative" }}>
              <a href={voteHref} style={{ textDecoration: "none", display: "block" }}>
                <div style={{
                  background: "rgba(28,29,54,0.8)",
                  border: `1px solid ${isApproved ? "rgba(74,222,128,0.2)" : "rgba(255,140,0,0.15)"}`,
                  borderTop: `2px solid ${isApproved ? "#4ade80" : "rgba(255,140,0,0.4)"}`,
                  borderRadius: 4, padding: "14px 20px",
                  display: "flex", flexDirection: "column", gap: 6,
                  transition: "border-color 0.15s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = isApproved ? "rgba(74,222,128,0.5)" : "rgba(255,140,0,0.6)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = isApproved ? "rgba(74,222,128,0.2)" : "rgba(255,140,0,0.15)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: isApproved ? "#4ade80" : "#FF8C00", textTransform: "uppercase", flex: 1 }}>
                      {mod.config.name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                      color: isApproved ? "#4ade80" : "#00e3fd",
                      border: `1px solid ${isApproved ? "rgba(74,222,128,0.3)" : "rgba(0,227,253,0.3)"}`,
                      padding: "2px 8px", borderRadius: 2,
                    }}>
                      {isApproved ? "Zatwierdzony" : "W głosowaniu"}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>
                    {mod.config.description}
                  </p>
                  {/* Bottom row: author + vote button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0, letterSpacing: "0.06em" }}>
                      {author} · {date}
                    </p>
                    <button
                      onClick={(e) => handleVote(e, mod.id)}
                      disabled={!canVote || isApproved}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", fontSize: 12, fontWeight: 700,
                        cursor: voted || isApproved ? "default" : canVote ? "pointer" : "not-allowed",
                        border: `1px solid ${voted || isApproved ? "rgba(74,222,128,0.3)" : canVote ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.1)"}`,
                        background: voted || isApproved ? "rgba(74,222,128,0.08)" : canVote ? "rgba(248,113,113,0.08)" : "transparent",
                        color: voted || isApproved ? "#4ade80" : canVote ? "#f87171" : "rgba(255,255,255,0.2)",
                        borderRadius: 3, flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 14, lineHeight: 1 }}>
                        {voted || isApproved ? "✓" : "❤"}
                      </span>
                      <span>{votingId === mod.id ? "..." : voted || isApproved ? "Zagłosowano" : "Zagłosuj"}</span>
                      <span style={{ fontSize: 11, opacity: 0.6 }}>·</span>
                      <span style={{ fontSize: 11 }}>{mod.votes}</span>
                    </button>
                  </div>
                </div>
              </a>
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAdminDelete(mod.id); }}
                  disabled={deletingId === mod.id}
                  style={{
                    position: "absolute", top: 10, right: 10,
                    padding: "3px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase", cursor: "pointer",
                    border: "1px solid rgba(248,113,113,0.3)", background: "rgba(15,12,31,0.95)",
                    color: "rgba(248,113,113,0.6)", borderRadius: 2,
                  }}
                >
                  {deletingId === mod.id ? "..." : "Usuń"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const backLinkStyle: React.CSSProperties = {
  fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "rgba(255,140,0,0.5)", textDecoration: "none", fontWeight: 700,
};
