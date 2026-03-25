"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import type { Game } from "phaser";
import type { Room } from "colyseus.js";

type Status = "connecting" | "conflict" | "playing";

export default function PhaserGame() {
  const [status, setStatus] = useState<Status>("connecting");
  const initialized = useRef(false);
  const gameRef = useRef<Game | null>(null);
  const roomRef = useRef<Room | null>(null);
  const startPhaserRef = useRef<(() => void) | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const { Game, AUTO, Scale } = await import("phaser");
      const { PlayScene } = await import("./scenes/PlayScene");
      const { connectRoom } = await import("./network/ColyseusClient");

      const token = await getToken().catch(() => null);

      const nickname = user
        ? (user.firstName
            ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
            : user.username ?? user.emailAddresses[0]?.emailAddress?.split("@")[0] ?? undefined)
        : undefined;

      const groupId = new URLSearchParams(window.location.search).get("groupId") ?? undefined;

      try {
        const r = await connectRoom(token ?? undefined, nickname, groupId);
        roomRef.current = r;
      } catch (err) {
        console.warn("Colyseus connection failed (offline?):", err);
        setStatus("playing");
        return;
      }

      const startPhaser = () => {
        gameRef.current = new Game({
          type: AUTO,
          width: 800,
          height: 600,
          parent: "game-container",
          backgroundColor: "#2d6a2d",
          pixelArt: true,
          audio: { noAudio: true },
          scale: {
            mode: Scale.FIT,
            autoCenter: Scale.CENTER_HORIZONTALLY,
          },
          scene: [PlayScene],
        });
        setStatus("playing");
      };

      startPhaserRef.current = startPhaser;

      if (roomRef.current) {
        // Wait for server to confirm session status (works for both logged-in and guest)
        await new Promise<void>((resolve) => {
          const r = roomRef.current!;
          const onReady = () => { r.removeAllListeners("session_ready"); r.removeAllListeners("session_conflict"); resolve(); startPhaser(); };
          const onConflict = () => { r.removeAllListeners("session_ready"); r.removeAllListeners("session_conflict"); resolve(); setStatus("conflict"); };
          r.onMessage("session_ready", onReady);
          r.onMessage("session_conflict", onConflict);
        });
      }
    })();

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  const handleConfirmTakeover = () => {
    roomRef.current?.send("confirm_takeover");
    startPhaserRef.current?.();
  };

  const handleDeclineTakeover = () => {
    roomRef.current?.send("decline_takeover");
    roomRef.current?.leave();
    window.location.href = "/";
  };

  if (status === "conflict") {
    return (
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.85)", zIndex: 100,
        fontFamily: "'Courier New', monospace",
      }}>
        <div style={{
          background: "#0d0d1a", border: "1px solid #00e3fd",
          padding: "40px 48px", maxWidth: 400, textAlign: "center",
          boxShadow: "0 0 30px rgba(0,227,253,0.2)",
        }}>
          <div style={{ color: "#00e3fd", fontSize: 11, letterSpacing: 3, marginBottom: 16 }}>
            KONFLIKT SESJI
          </div>
          <h2 style={{ color: "#fff", fontSize: 18, margin: "0 0 12px", fontWeight: 600 }}>
            Gra aktywna w innym oknie
          </h2>
          <p style={{ color: "#a9a9c2", fontSize: 13, margin: "0 0 32px", lineHeight: 1.6 }}>
            Twoja sesja jest już otwarta w innej karcie lub przeglądarce.
            Czy chcesz przejąć sesję i grać tutaj?
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={handleDeclineTakeover} style={{
              background: "transparent", border: "1px solid #444",
              color: "#a9a9c2", padding: "10px 24px", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, letterSpacing: 1,
            }}>
              ANULUJ
            </button>
            <button onClick={handleConfirmTakeover} style={{
              background: "#00e3fd", border: "none",
              color: "#0d0d1a", padding: "10px 24px", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700, letterSpacing: 1,
            }}>
              PRZEJMIJ SESJĘ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0d0d1a", fontFamily: "'Courier New', monospace",
      }}>
        <div style={{ color: "#00e3fd", fontSize: 12, letterSpacing: 3 }}>ŁĄCZENIE...</div>
      </div>
    );
  }

  return null;
}
