"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const S = {
  display: "var(--font-display), 'Space Grotesk', sans-serif",
  body: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
};

const EVENT_COLORS: Record<string, string> = {
  death:     "#f87171",
  epic_loot: "#f183ff",
  rare_loot: "#FFD700",
  kill:      "#FF8C00",
  default:   "#a9a9c2",
};

type HistoryEntry = {
  id: string;
  room_id: string;
  group_id: string | null;
  events_count: number;
  top_events: Array<{ type: string; player: string; message: string; time: string }>;
  period_start: string;
  period_end: string;
  created_at: string;
};

function RoomHistoryContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const groupName = searchParams.get("groupName");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = groupId ? `/api/room-history?groupId=${groupId}` : "/api/room-history";
    fetch(url).then(r => r.json()).then(data => {
      setEntries(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [groupId]);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0c1f", padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-pixel), 'Press Start 2P', monospace", color: "#FF8C00", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.03em", margin: 0, lineHeight: 1.7 }}>
            Room History
          </h1>
          <p style={{ fontFamily: S.body, color: "#46465b", fontSize: 11, margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Podsumowania sesji gry
          </p>
        </div>
        <a href={groupId ? `/game?groupId=${groupId}${groupName ? `&groupName=${encodeURIComponent(groupName)}` : ""}` : "/game"} style={{
          fontFamily: S.display, fontWeight: 900, fontSize: 10, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "rgba(169,169,194,0.6)", textDecoration: "none",
          border: "1px solid rgba(169,169,194,0.2)", padding: "6px 14px",
        }}>
          ← Wróć do gry
        </a>
      </div>

      {loading && (
        <p style={{ fontFamily: S.body, color: "#46465b", fontSize: 12 }}>Ładowanie...</p>
      )}

      {!loading && entries.length === 0 && (
        <div style={{
          background: "rgba(28,29,54,0.6)", border: "1px solid #16172e",
          padding: 32, textAlign: "center",
        }}>
          <p style={{ fontFamily: S.body, color: "#46465b", fontSize: 13 }}>
            Brak historii — eventy są archiwizowane co godzinę.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {entries.map(entry => (
          <div key={entry.id} style={{
            background: "rgba(28,29,54,0.6)",
            border: "1px solid #16172e",
            borderTop: "2px solid rgba(255,140,0,0.3)",
          }}>
            {/* Entry header */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #16172e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontFamily: S.display, color: "#e4e3fe", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                  #{entry.room_id.slice(0, 8).toUpperCase()}
                </span>
                <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 9, marginLeft: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {entry.events_count} eventów
                </span>
              </div>
              <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 9 }}>
                {new Date(entry.created_at).toLocaleString("pl-PL")}
              </span>
            </div>

            {/* Events */}
            <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 3 }}>
              {entry.top_events.slice(0, 10).map((ev, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontFamily: S.body, color: "#2a2b45", fontSize: 8, flexShrink: 0 }}>
                    {new Date(ev.time).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span style={{ fontFamily: S.body, color: EVENT_COLORS[ev.type] ?? EVENT_COLORS.default, fontSize: 11 }}>
                    {ev.message}
                  </span>
                </div>
              ))}
              {entry.top_events.length > 10 && (
                <span style={{ fontFamily: S.body, color: "#46465b", fontSize: 9, marginTop: 4 }}>
                  + {entry.top_events.length - 10} więcej...
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoomHistoryPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0b0c1f", minHeight: "100vh" }} />}>
      <RoomHistoryContent />
    </Suspense>
  );
}
