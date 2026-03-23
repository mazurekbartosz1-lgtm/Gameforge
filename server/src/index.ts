import "dotenv/config";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Encoder } from "@colyseus/schema";
import { GameRoom } from "./GameRoom.js";
import type { Request, Response, NextFunction } from "express";

// Dense resource nodes exceed default buffer — increase to 256KB
Encoder.BUFFER_SIZE = 256 * 1024;

const PORT = Number(process.env.PORT ?? 2567);

const transport = new WebSocketTransport();

// Allow CORS for Colyseus HTTP matchmaking endpoints
const app = transport.getExpressApp();
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const gameServer = new Server({ transport });

gameServer.define("game_room", GameRoom);

// Health endpoint — used by /status page
app.get("/health", async (_req: Request, res: Response) => {
  const rooms = await matchMaker.query({});
  const totalPlayers = rooms.reduce((sum, r) => sum + r.clients, 0);
  const totalAuthenticated = rooms.reduce((sum, r) => sum + ((r.metadata as any)?.authenticated ?? 0), 0);
  const totalGuests = rooms.reduce((sum, r) => sum + ((r.metadata as any)?.guests ?? 0), 0);
  res.json({
    status: "ok",
    rooms: rooms.map((r) => ({
      roomId: r.roomId,
      clients: r.clients,
      name: r.name,
      authenticated: (r.metadata as any)?.authenticated ?? 0,
      guests: (r.metadata as any)?.guests ?? 0,
    })),
    totalRooms: rooms.length,
    totalPlayers,
    totalAuthenticated,
    totalGuests,
  });
});

gameServer.listen(PORT, "0.0.0.0").then(() => {
  console.log(`[Colyseus] Listening on ws://0.0.0.0:${PORT}`);
}).catch((err) => {
  console.error("[Colyseus] Failed to start:", err);
  process.exit(1);
});
