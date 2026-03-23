"use client";

import { useEffect, useState } from "react";
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

function StatBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="font-mono">{Math.floor(value)}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function PlayerPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  useEffect(() => {
    const handler = (e: Event) => setStats((e as CustomEvent<Stats>).detail);
    window.addEventListener("gameStats", handler);
    return () => window.removeEventListener("gameStats", handler);
  }, []);

  const clerkName = isLoaded && isSignedIn
    ? user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
      : user?.emailAddresses[0]?.emailAddress ?? "Gracz"
    : null;

  const displayName = clerkName ?? stats?.nickname ?? "Gość";
  const isGuest = isLoaded && !isSignedIn;

  return (
    <div className="h-full bg-zinc-900 border-l border-zinc-800 flex flex-col p-4 gap-5 overflow-y-auto" style={{ width: 240 }}>
      {/* Gracz */}
      <div className="flex flex-col gap-1">
        <span className="text-zinc-500 text-xs uppercase tracking-wider">Gracz</span>
        <span className="text-white text-sm font-semibold truncate">{displayName}</span>
        {stats != null && (
          <span className="text-xs" style={{ color: stats.isNight ? "#93c5fd" : "#fcd34d" }}>
            {stats.isNight ? "🌙 Noc" : "☀️ Dzień"}
          </span>
        )}
        {isGuest && (
          <button
            onClick={() => openSignIn()}
            className="mt-1 text-xs font-semibold text-zinc-950 bg-white rounded-md py-1 px-3 hover:bg-zinc-200 transition-colors self-start"
          >
            Zaloguj się
          </button>
        )}
      </div>

      {/* Statystyki — paski */}
      <div className="flex flex-col gap-3">
        <span className="text-zinc-500 text-xs uppercase tracking-wider">Statystyki</span>
        <StatBar label="HP" value={stats?.hp ?? 100} max={stats?.maxHp ?? 100} color="#f87171" />
        <StatBar label="Głód" value={stats?.hunger ?? 100} max={100} color="#fb923c" />
        <StatBar label="Zdrowie psych." value={stats?.sanity ?? 100} max={100} color="#a78bfa" />
      </div>

      {/* Statystyki bojowe */}
      <div className="flex flex-col gap-2">
        <span className="text-zinc-500 text-xs uppercase tracking-wider">Walka</span>
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 flex flex-col items-center gap-0.5">
            <span className="text-zinc-400 text-[10px] uppercase tracking-wide">Atak</span>
            <span
              className="text-lg font-bold font-mono"
              style={{ color: (stats?.sanity ?? 100) <= 0 ? "#f87171" : "#fb923c" }}
              title={(stats?.sanity ?? 100) <= 0 ? "Obniżony przez brak zdrowia psychicznego" : undefined}
            >
              {stats?.attack ?? 5}
            </span>
            {(stats?.sanity ?? 100) <= 0 && (
              <span className="text-red-500 text-[9px]">↓ obniżony</span>
            )}
          </div>
          <div className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 flex flex-col items-center gap-0.5">
            <span className="text-zinc-400 text-[10px] uppercase tracking-wide">Obrona</span>
            <span className="text-blue-400 text-lg font-bold font-mono">{stats?.defense ?? 2}</span>
          </div>
        </div>
      </div>

      {/* Ekwipunek */}
      <div className="flex flex-col gap-3">
        <span className="text-zinc-500 text-xs uppercase tracking-wider">Ekwipunek</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: "⚔", label: "Broń" },
            { icon: "🛡", label: "Zbroja" },
            { icon: "⛑", label: "Hełm" },
            { icon: "+", label: "Przedmiot" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              title={label}
              className="aspect-square rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center gap-1"
            >
              <span className="text-zinc-500 text-lg leading-none">{icon}</span>
              <span className="text-zinc-600 text-[10px]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
