"use client";

import { useEffect, useState } from "react";

type ColyseusHealth = {
  status: string;
  rooms: { roomId: string; name: string; clients: number; authenticated: number; guests: number }[];
  totalRooms: number;
  totalPlayers: number;
  totalAuthenticated: number;
  totalGuests: number;
};

const COLYSEUS_HTTP = (process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567")
  .replace(/^wss:\/\//, "https://")
  .replace(/^ws:\/\//, "http://");

const S = {
  display: "var(--font-display), 'Space Grotesk', sans-serif",
  body: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
};

function StatusPip({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      width: 8,
      height: 8,
      flexShrink: 0,
      background: ok ? "#4ade80" : "#f87171",
      boxShadow: ok ? "0 0 8px #4ade80" : "0 0 8px #f87171",
    }} />
  );
}

function ServiceCard({
  name, ok, details,
}: {
  name: string;
  ok: boolean;
  details: { label: string; value: string | number }[];
}) {
  return (
    <div style={{
      background: "#0e0f22",
      borderTop: `2px solid ${ok ? "#4ade80" : "#f87171"}`,
      borderRight: "1px solid rgba(70,70,91,0.4)",
      borderBottom: "1px solid rgba(70,70,91,0.4)",
      borderLeft: "1px solid rgba(70,70,91,0.4)",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <StatusPip ok={ok} />
        <span style={{
          fontFamily: S.display,
          color: "#e4e3fe",
          fontWeight: 700,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}>
          {name}
        </span>
        <span style={{
          marginLeft: "auto",
          fontFamily: S.body,
          fontSize: 10,
          fontWeight: 700,
          color: ok ? "#4ade80" : "#f87171",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}>
          {ok ? "ONLINE" : "OFFLINE"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {details.map((d) => (
          <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              fontFamily: S.body,
              color: "#46465b",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              {d.label}
            </span>
            <span style={{
              fontFamily: S.display,
              color: "#a9a9c2",
              fontSize: 11,
              fontWeight: 600,
            }}>
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [colyseus, setColyseus] = useState<ColyseusHealth | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch(`${COLYSEUS_HTTP}/health`);
        setColyseus(res.ok ? await res.json() : null);
      } catch {
        setColyseus(null);
      }
      setLastUpdated(new Date());
    }
    fetchHealth();
    const id = setInterval(fetchHealth, 2000);
    return () => clearInterval(id);
  }, []);

  const clerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkEnv = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live")
    ? "PRODUCTION"
    : "DEVELOPMENT";

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0b0c1f",
      padding: "40px 24px",
      position: "relative",
    }}>
      {/* Subtle background glow */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse 50% 30% at 50% 100%, rgba(255,140,0,0.06) 0%, transparent 100%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}>
        {/* Header */}
        <div>
          <p style={{
            fontFamily: S.display,
            fontSize: 9,
            color: "rgba(255,140,0,0.7)",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: "0 0 8px",
          }}>
            GAMEFORGE ENGINE
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <h1 style={{
              fontFamily: S.display,
              fontSize: 26,
              fontWeight: 900,
              color: "#e4e3fe",
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              margin: 0,
              lineHeight: 1,
            }}>
              SYSTEM STATUS
            </h1>
            {lastUpdated && (
              <span style={{
                fontFamily: S.display,
                color: "#46465b",
                fontSize: 10,
                fontWeight: 600,
              }}>
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          {/* Decorative line */}
          <div style={{
            marginTop: 10,
            height: 2,
            background: "linear-gradient(to right, #FF8C00, #00e3fd, transparent)",
            width: "60%",
          }} />
          <p style={{
            fontFamily: S.body,
            color: "#46465b",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            margin: "8px 0 0",
          }}>
            AUTO-REFRESH EVERY 2 SECONDS
          </p>
        </div>

        {/* Service cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ServiceCard
            name="Colyseus Game Server"
            ok={colyseus !== null}
            details={[
              { label: "Host", value: COLYSEUS_HTTP.replace(/^https?:\/\//, "") },
              { label: "Active Rooms", value: colyseus?.totalRooms ?? "—" },
              { label: "Players Online", value: colyseus?.totalPlayers ?? "—" },
              { label: "Authenticated", value: colyseus?.totalAuthenticated ?? "—" },
              { label: "Guests", value: colyseus?.totalGuests ?? "—" },
              ...(colyseus?.rooms ?? []).map((r) => ({
                label: `  ${r.roomId}`,
                value: `${r.authenticated} auth + ${r.guests} guests`,
              })),
            ]}
          />

          <ServiceCard
            name="Clerk Auth"
            ok={clerkConfigured}
            details={[
              { label: "Environment", value: clerkEnv },
              { label: "Method", value: "Email OTP + Social" },
            ]}
          />

          <ServiceCard
            name="Supabase"
            ok={false}
            details={[{ label: "Status", value: "Not configured (W19)" }]}
          />
        </div>

        {/* Quest tracker decoration */}
        <div>
          <div style={{ height: 2, width: "100%", background: "rgba(34,35,62,0.8)", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "linear-gradient(to right, #FF8C00, #00e3fd, #f183ff)", width: "40%" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "0 2px" }}>
            <span style={{ color: "#FF8C00", fontSize: 10 }}>★</span>
            <span style={{ color: "#FF8C00", fontSize: 10 }}>★</span>
            <span style={{ color: "rgba(70,70,91,0.5)", fontSize: 10 }}>□</span>
          </div>
        </div>

        <p style={{
          fontFamily: S.display,
          color: "#46465b",
          fontSize: 9,
          textAlign: "right",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          margin: 0,
        }}>
          GAMEFORGE ENGINE v1.0.4
        </p>
      </div>
    </main>
  );
}
