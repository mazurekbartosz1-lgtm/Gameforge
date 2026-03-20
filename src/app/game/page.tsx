import GameLoader from "./GameLoader";

export default function GamePage() {
  return (
    <div
      id="game-container"
      style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}
    >
      <GameLoader />
    </div>
  );
}
