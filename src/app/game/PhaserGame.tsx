"use client";

import { useEffect, useRef } from "react";
import type { Game } from "phaser";

export default function PhaserGame() {
  const initialized = useRef(false);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const { Game, AUTO, Scale } = await import("phaser");
      const { GameScene } = await import("./GameScene");

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
          autoCenter: Scale.CENTER_BOTH,
        },
        scene: [GameScene],
      });
    })();

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  return null;
}
