"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("./PhaserGame"), { ssr: false });

export default function GameLoader() {
  return <PhaserGame />;
}
