import { Client, Room } from "colyseus.js";

const wsUrl =
  process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";

// HTTP base for matchmake requests (same host, http/https instead of ws/wss)
const httpUrl = wsUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = new Client(wsUrl) as any;
let room: Room | null = null;

async function joinAsGuest(guestId: string): Promise<Room> {
  // Get all available rooms, pick the one with fewest players
  const rooms: Array<{ roomId: string; clients: number; maxClients: number }> =
    await fetch(`${httpUrl}/matchmake/game_room`).then((r) => r.json()).catch(() => []);

  const available = (Array.isArray(rooms) ? rooms : []).filter(
    (r) => r.clients < r.maxClients
  );

  if (available.length === 0) {
    // No active rooms — create a temporary shared room
    const raw = await fetch(`${httpUrl}/matchmake/joinOrCreate/game_room`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ guestId }),
    }).then((r) => r.json());
    const response = {
      room: { name: raw.name, roomId: raw.roomId, processId: raw.processId },
      sessionId: raw.sessionId,
    };
    return client.consumeSeatReservation(response);
  }

  // Pick room with fewest players (even distribution)
  available.sort((a, b) => a.clients - b.clients);
  const target = available[0];

  const raw = await fetch(`${httpUrl}/matchmake/joinById/${target.roomId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ guestId }),
  }).then((r) => r.json());

  const response = {
    room: { name: raw.name, roomId: raw.roomId, processId: raw.processId },
    sessionId: raw.sessionId,
  };

  return client.consumeSeatReservation(response);
}

export async function connectRoom(token?: string, nickname?: string, groupId?: string): Promise<Room> {
  if (room) return room;

  // Guest ID: persists within same browser tab session (sessionStorage survives F5,
  // is cleared when the tab/browser is closed — that's intentional for guests).
  if (!token) {
    let guestId = sessionStorage.getItem("guestId") ?? undefined;
    if (!guestId) {
      guestId = crypto.randomUUID();
      sessionStorage.setItem("guestId", guestId);
    }
    room = await joinAsGuest(guestId);
    console.log("Colyseus guest connected, sessionId:", room!.sessionId);
    return room as Room;
  }

  // colyseus.js@0.16 expects { room: { name, roomId, processId }, sessionId }
  // colyseus@0.17 server returns flat { name, roomId, sessionId, processId }
  // We call matchmake ourselves and reformat before passing to consumeSeatReservation.
  const raw = await fetch(`${httpUrl}/matchmake/joinOrCreate/game_room`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token, nickname, groupId }),
  }).then((r) => r.json());

  const response = {
    room: { name: raw.name, roomId: raw.roomId, processId: raw.processId },
    sessionId: raw.sessionId,
  };

  room = await client.consumeSeatReservation(response);
  console.log("Colyseus connected, sessionId:", room!.sessionId);
  return room as Room;
}

export function getRoom(): Room | null {
  return room;
}
