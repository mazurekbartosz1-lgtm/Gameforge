import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./GameRoom.js";

const PORT = Number(process.env.PORT) || 2567;

const gameServer = new Server({
  transport: new WebSocketTransport(),
});

gameServer.define("game_room", GameRoom);

gameServer.listen(PORT).then(() => {
  console.log(`[Colyseus] Listening on ws://localhost:${PORT}`);
}).catch((err) => {
  console.error("[Colyseus] Failed to start:", err);
  process.exit(1);
});
