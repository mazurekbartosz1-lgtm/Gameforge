"use client";

import { useEffect, useState } from "react";
import type { ModConfig } from "@/shared/modConfig";
import ForgeNav from "../../components/ForgeNav";

interface SubmittedMod {
  id: string;
  config: ModConfig;
  status: string;
  votes: number;
  created_at: string;
  players?: { nickname: string };
}

export default function GlosowaniePage() {
  const groupId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("groupId") : null;

  const [mods, setMods] = useState<SubmittedMod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = groupId ? `?groupId=${groupId}` : "";
    fetch(`/api/forge/mods/submitted${qs}`)
      .then((r) => r.json())
      .then((data) => setMods(data.mods ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0c1f", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px" }}>
      <div style={{ width: "100%", maxWidth: 600, marginBottom: 32 }}>
        <a href="/" style={backLinkStyle}>← Gameforge</a>
        <h1 style={{ fontFamily: "var(--font-pixel), 'Press Start 2P', monospace", fontSize: 13, color: "#FF8C00", textTransform: "uppercase", marginTop: 16, marginBottom: 8, lineHeight: 1.7, letterSpacing: "0.03em" }}>
          Voting
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", margin: 0 }}>
          Mody zgłoszone przez graczy do głosowania{groupId ? " w twojej grupie" : ""}.
        </p>
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
          return (
            <a
              key={mod.id}
              href={`/forge/vote/${mod.id}`}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                background: "rgba(28,29,54,0.8)", border: "1px solid rgba(255,140,0,0.15)",
                borderTop: "2px solid rgba(255,140,0,0.4)", borderRadius: 4, padding: "16px 20px",
                display: "flex", flexDirection: "column", gap: 6,
                transition: "border-color 0.15s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,140,0,0.6)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,140,0,0.15)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "#FF8C00", textTransform: "uppercase", flex: 1 }}>
                    {mod.config.name}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "#00e3fd", border: "1px solid rgba(0,227,253,0.3)", padding: "2px 8px", borderRadius: 2,
                  }}>
                    W głosowaniu
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>
                  {mod.config.description}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0, letterSpacing: "0.06em" }}>
                  {author} · {date}
                </p>
              </div>
            </a>
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
