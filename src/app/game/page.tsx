import GameLoader from "./GameLoader";
import PlayerPanel from "./PlayerPanel";

export default function GamePage() {
  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "row", overflow: "hidden" }}>
      <div id="game-container" style={{ flex: 1, minWidth: 0, height: "100%" }}>
        <GameLoader />
      </div>
      <PlayerPanel />
    </div>
  );
}
