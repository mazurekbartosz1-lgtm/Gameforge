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

// ─── Player persistence ───────────────────────────────────────────────────────

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
