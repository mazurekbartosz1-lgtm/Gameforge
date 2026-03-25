"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import type { Game } from "phaser";

export default function PhaserGame() {
  const initialized = useRef(false);
  const gameRef = useRef<Game | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const { Game, AUTO, Scale } = await import("phaser");
      const { PlayScene } = await import("./scenes/PlayScene");
      const { connectRoom } = await import("./network/ColyseusClient");

      // Get Clerk JWT token (null if user not signed in)
      const token = await getToken().catch(() => null);

      // Build display name from Clerk user data
      const nickname = user
        ? (user.firstName
            ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
            : user.username ?? user.emailAddresses[0]?.emailAddress?.split("@")[0] ?? undefined)
        : undefined;

      // Read groupId from URL ?groupId=... if present
      const groupId = new URLSearchParams(window.location.search).get("groupId") ?? undefined;

      // Connect to Colyseus before starting Phaser so getRoom() works in PlayScene
      try {
        await connectRoom(token ?? undefined, nickname, groupId);
      } catch (err) {
        console.warn("Colyseus connection failed (offline?):", err);
      }

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
    })();

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  return null;
}
