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

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? "bg-green-400" : "bg-red-500"}`} />
  );
}

function ServiceCard({
  name,
  ok,
  details,
}: {
  name: string;
  ok: boolean;
  details: { label: string; value: string | number }[];
}) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <StatusDot ok={ok} />
        <span className="text-white font-semibold text-sm">{name}</span>
        <span className={`ml-auto text-xs font-medium ${ok ? "text-green-400" : "text-red-400"}`}>
          {ok ? "online" : "offline"}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {details.map((d) => (
          <div key={d.label} className="flex justify-between text-xs">
            <span className="text-zinc-500">{d.label}</span>
            <span className="text-zinc-300 font-mono">{d.value}</span>
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
    ? "production"
    : "development";

  return (
    <main className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">System Status</h1>
            <p className="text-zinc-500 text-sm mt-1">Odświeżane co 2 sekundy</p>
          </div>
          {lastUpdated && (
            <span className="text-zinc-600 text-xs font-mono">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <ServiceCard
            name="Colyseus Game Server"
            ok={colyseus !== null}
            details={[
              { label: "Host", value: COLYSEUS_HTTP.replace(/^https?:\/\//, "") },
              { label: "Aktywne pokoje", value: colyseus?.totalRooms ?? "—" },
              { label: "Gracze online", value: colyseus?.totalPlayers ?? "—" },
              { label: "  zalogowani", value: colyseus?.totalAuthenticated ?? "—" },
              { label: "  goście", value: colyseus?.totalGuests ?? "—" },
              ...(colyseus?.rooms ?? []).map((r) => ({
                label: `  ${r.roomId}`,
                value: `${r.authenticated} zalog. + ${r.guests} gości`,
              })),
            ]}
          />

          <ServiceCard
            name="Clerk Auth"
            ok={clerkConfigured}
            details={[
              { label: "Środowisko", value: clerkEnv },
              { label: "Metoda logowania", value: "Email OTP" },
            ]}
          />

          <ServiceCard
            name="Supabase"
            ok={false}
            details={[{ label: "Status", value: "nie skonfigurowany (W19)" }]}
          />
        </div>

        <p className="text-zinc-700 text-xs text-right">Gameforge — Wieczór 18</p>
      </div>
    </main>
  );
}
