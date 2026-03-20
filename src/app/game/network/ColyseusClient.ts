import { Client, Room } from "colyseus.js";

const url =
  process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";

const client = new Client(url);
let room: Room | null = null;

export async function connectRoom(): Promise<Room> {
  if (room) return room;
  room = await client.joinOrCreate("game_room");
  console.log("Colyseus connected, sessionId:", room.sessionId);
  return room;
}

export function getRoom(): Room | null {
  return room;
}
