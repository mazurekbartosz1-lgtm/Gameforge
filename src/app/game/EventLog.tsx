"use client";

import { useEffect, useRef, useState } from "react";

type RoomEvent = {
  id: string;
  type: string;
  playerName: string;
  message: string;
  timestamp: number;
};

const EVENT_COLORS: Record<string, string> = {
  death:      "#f87171",
  epic_loot:  "#f183ff",
  rare_loot:  "#FFD700",
  kill:       "#FF8C00",
  default:    "#a9a9c2",
};

const MAX_EVENTS = 40;

export default function EventLog() {
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = (e as CustomEvent<RoomEvent>).detail;
      setEvents((prev) => {
        const next = [ev, ...prev];
        return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
      });
    };
    window.addEventListener("gameRoomEvent", handler);
    return () => window.removeEventListener("gameRoomEvent", handler);
  }, []);

  return (
    <div style={{
      height: 110,
      flexShrink: 0,
      background: "rgba(11,12,31,0.95)",
      borderTop: "1px solid #16172e",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "4px 12px",
        borderBottom: "1px solid #16172e",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF8C00", flexShrink: 0 }} />
        <span style={{
          fontFamily: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
          color: "#46465b",
          fontSize: 7,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          fontWeight: 700,
        }}>
          EVENT LOG
        </span>
      </div>

      {/* Events */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {events.length === 0 ? (
          <span style={{
            fontFamily: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
            color: "#2a2b45",
            fontSize: 10,
            fontStyle: "italic",
            marginTop: 4,
          }}>
            Brak eventów — zacznij grać...
          </span>
        ) : (
          events.map((ev) => (
            <div key={ev.id} style={{ display: "flex", alignItems: "baseline", gap: 8, lineHeight: 1.4 }}>
              <span style={{
                fontFamily: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
                color: "#2a2b45",
                fontSize: 8,
                flexShrink: 0,
              }}>
                {new Date(ev.timestamp).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span style={{
                fontFamily: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
                color: EVENT_COLORS[ev.type] ?? EVENT_COLORS.default,
                fontSize: 10,
              }}>
                {ev.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
