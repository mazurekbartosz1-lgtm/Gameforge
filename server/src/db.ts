import { createClient } from "@supabase/supabase-js";
import { PlayerState } from "./GameRoom.js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

interface PlayerRow {
  id: string;
  clerk_id: string;
  nickname: string;
  x: number;
  y: number;
  hp: number;
  max_hp: number;
  hunger: number;
  sanity: number;
  attack: number;
  defense: number;
  inventory: string[];
  equipment: Record<string, string>;
  active_slot: number;
  fog: string[];
}

export async function loadPlayer(
  clerkId: string,
  nickname: string
): Promise<PlayerRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("players")
      .select("*")
      .eq("clerk_id", clerkId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = row not found
      console.warn("[DB] loadPlayer error:", error.message);
      return null;
    }

    if (data) {
      return data as PlayerRow;
    }

    // First time — insert new player at world spawn (0,0 = safe zone center)
    const { data: newPlayer, error: insertError } = await supabaseAdmin
      .from("players")
      .insert({ clerk_id: clerkId, nickname, x: 0, y: 0 })
      .select("*")
      .single();

    if (insertError) {
      console.warn("[DB] insertPlayer error:", insertError.message);
      return null;
    }

    console.log(`[DB] Created new player record for ${nickname} (${clerkId})`);
    return newPlayer as PlayerRow;
  } catch (err) {
    console.warn("[DB] loadPlayer exception:", err);
    return null;
  }
}

// ─── World config (shared map seed) ─────────────────────────────────────────

export async function loadWorldSeed(): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("world_config")
      .select("value")
      .eq("key", "map_seed")
      .single();

    if (error && error.code !== "PGRST116") {
      console.warn("[DB] loadWorldSeed error:", error.message);
      return null;
    }
    return data ? parseInt(data.value, 10) : null;
  } catch (err) {
    console.warn("[DB] loadWorldSeed exception:", err);
    return null;
  }
}

export async function saveWorldSeed(seed: number): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("world_config")
      .upsert({ key: "map_seed", value: String(seed) });
    if (error) console.warn("[DB] saveWorldSeed error:", error.message);
    else console.log(`[DB] World seed saved: ${seed}`);
  } catch (err) {
    console.warn("[DB] saveWorldSeed exception:", err);
  }
}

// ─── Dead resource persistence (world-level) ─────────────────────────────────

export async function loadDeadResources(): Promise<{ deadTrees: string[]; deadRocks: string[] }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("world_config")
      .select("key, value")
      .in("key", ["dead_trees", "dead_rocks"]);

    if (error) { console.warn("[DB] loadDeadResources error:", error.message); return { deadTrees: [], deadRocks: [] }; }

    const rows = (data ?? []) as { key: string; value: string }[];
    const deadTrees = JSON.parse(rows.find(r => r.key === "dead_trees")?.value ?? "[]") as string[];
    const deadRocks = JSON.parse(rows.find(r => r.key === "dead_rocks")?.value ?? "[]") as string[];
    return { deadTrees, deadRocks };
  } catch (err) {
    console.warn("[DB] loadDeadResources exception:", err);
    return { deadTrees: [], deadRocks: [] };
  }
}

export async function saveDeadResources(deadTrees: string[], deadRocks: string[]): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("world_config")
      .upsert([
        { key: "dead_trees", value: JSON.stringify(deadTrees) },
        { key: "dead_rocks", value: JSON.stringify(deadRocks) },
      ]);
    if (error) console.warn("[DB] saveDeadResources error:", error.message);
  } catch (err) {
    console.warn("[DB] saveDeadResources exception:", err);
  }
}

// ─── Room events ─────────────────────────────────────────────────────────────

export async function insertRoomEvent(
  roomId: string, groupId: string | null,
  eventType: string, playerName: string, message: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("room_events").insert({
      room_id: roomId, group_id: groupId ?? null, event_type: eventType, player_name: playerName, message,
    });
    if (error) console.warn("[DB] insertRoomEvent error:", error.message);
  } catch (err) { console.warn("[DB] insertRoomEvent exception:", err); }
}

export async function archiveOldEvents(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: old, error: fetchErr } = await supabaseAdmin
      .from("room_events").select("*").lt("created_at", cutoff);
    if (fetchErr || !old?.length) return;

    // Group by room_id+group_id
    const groups = new Map<string, typeof old>();
    for (const ev of old) {
      const key = `${ev.room_id}::${ev.group_id ?? ""}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ev);
    }

    for (const [, events] of groups) {
      const first = events[0];
      const top_events = events.slice(0, 50).map(e => ({
        type: e.event_type, player: e.player_name, message: e.message, time: e.created_at,
      }));
      await supabaseAdmin.from("room_history").insert({
        room_id: first.room_id,
        group_id: first.group_id ?? null,
        events_count: events.length,
        top_events,
        period_start: events[events.length - 1].created_at,
        period_end: events[0].created_at,
      });
    }

    const ids = old.map(e => e.id);
    await supabaseAdmin.from("room_events").delete().in("id", ids);
    console.log(`[DB] Archived ${old.length} room events`);
  } catch (err) { console.warn("[DB] archiveOldEvents exception:", err); }
}

// ─── Per-room player state ────────────────────────────────────────────────────

interface RoomStateRow {
  player_id: string;
  group_id: string;
  x: number;
  y: number;
  inventory: string[];
}

export async function loadRoomState(playerId: string, groupId: string): Promise<RoomStateRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("player_room_states")
      .select("*")
      .eq("player_id", playerId)
      .eq("group_id", groupId)
      .maybeSingle();
    if (error) { console.warn("[DB] loadRoomState error:", error.message); return null; }
    return data as RoomStateRow | null;
  } catch (err) {
    console.warn("[DB] loadRoomState exception:", err);
    return null;
  }
}

export async function saveRoomState(playerId: string, groupId: string, player: PlayerState): Promise<void> {
  try {
    const inventory = Array.from(player.inventory);
    const { error } = await supabaseAdmin
      .from("player_room_states")
      .upsert({ player_id: playerId, group_id: groupId, x: player.x, y: player.y, inventory, updated_at: new Date().toISOString() });
    if (error) console.warn("[DB] saveRoomState error:", error.message);
  } catch (err) {
    console.warn("[DB] saveRoomState exception:", err);
  }
}

// ─── Player persistence ───────────────────────────────────────────────────────

/** Update mod status to 'submitted' and set group_id. Returns { name, description } or null. */
export async function submitModToGroup(
  modId: string,
  groupId: string
): Promise<{ name: string; description: string } | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("mod_configs")
      .update({ group_id: groupId, status: "submitted" })
      .eq("id", modId)
      .select("config")
      .single();
    if (error || !data) return null;
    const cfg = data.config as { name: string; description: string };
    return { name: cfg.name ?? "Mod", description: cfg.description ?? "" };
  } catch (err) {
    console.warn("[DB] submitModToGroup exception:", err);
    return null;
  }
}

export async function deletePlayer(userId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("players")
      .delete()
      .eq("clerk_id", userId);
    if (error) console.warn(`[DB] deletePlayer error for ${userId}:`, error.message);
    else console.log(`[DB] Deleted player record: ${userId}`);
  } catch (err) {
    console.warn("[DB] deletePlayer exception:", err);
  }
}

export async function savePlayer(player: PlayerState, fog: string[] = []): Promise<void> {
  // Skip anonymous players (no userId or userId === sessionId — old guest fallback)
  if (!player.userId || player.userId === player.sessionId) return;

  try {
    const inventory = Array.from(player.inventory);
    const equipment: Record<string, string> = {};
    player.equipment.forEach((itemId, slot) => {
      equipment[slot] = itemId;
    });

    const { error } = await supabaseAdmin
      .from("players")
      .update({
        nickname: player.nickname,
        x: player.x,
        y: player.y,
        hp: player.hp,
        max_hp: player.maxHp,
        hunger: player.hunger,
        sanity: player.sanity,
        attack: player.attack,
        defense: player.defense,
        inventory,
        equipment,
        active_slot: player.activeSlot,
        fog,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_id", player.userId);

    if (error) {
      console.warn(`[DB] savePlayer error for ${player.nickname}:`, error.message);
    } else {
      console.log(`[DB] Saved player ${player.nickname} (${player.userId})`);
    }
  } catch (err) {
    console.warn("[DB] savePlayer exception:", err);
  }
}
