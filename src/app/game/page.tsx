import { Suspense } from "react";
import GameLoader from "./GameLoader";
import PlayerPanel from "./PlayerPanel";
import GameHeader from "./GameHeader";
import EventLog from "./EventLog";

export default function GamePage() {
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "#0b0c1f",
    }}>
      <Suspense fallback={null}>
        <GameHeader />
      </Suspense>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row", overflow: "hidden" }}>
        {/* Left column: game + event log */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div id="game-container" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <GameLoader />
          </div>
          <EventLog />
        </div>
        <Suspense fallback={null}>
          <PlayerPanel />
        </Suspense>
      </div>
    </div>
  );
}
