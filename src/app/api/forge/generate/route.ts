import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ModConfig } from "@/shared/modConfig";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

const SYSTEM_PROMPT = `You are a mod generator for Gameforge — a 2D survival multiplayer game for children aged 10–14.

WHAT EXISTS IN THE GAME:
- Only one enemy base sprite: "hunter". No other sprites. Use tint + scale + particleEffect to make variants look different.
- Scale range: 0.4 (tiny) to 4.0 (giant).
- Particle effects (pick one or none): fire (burn DoT 5dmg/s), ice (slow 50%), poison (DoT 3dmg/s), electric (stun), shadow (lifesteal), holy (bonus damage).
- Food items to override: mushroom (hunger+20 hp+5), berries (hunger+15 hp+2), raw_meat (hunger+10), cooked_meat (hunger+40 hp+15).
- Existing items for add_item: wood, stone, mushroom, berries, raw_meat, cooked_meat, bone_sword, iron_sword, bone_armor, chain_mail, bone_helmet, iron_helmet, shadow_blade.
- Rule triggers: on_tick, every_Ns (needs intervalMs in ms), on_eat, on_cook, on_hunger_low, on_enemy_death, on_player_join.
- Condition fields: player.hunger, player.hp, player.sanity, world.isNight, world.weather, item.type, enemy.configId, random.
- Condition operators: <, >, ==, !=, includes.
- Effect actions: modify_stat (field: hp/hunger/sanity, target: player/all_players, value: delta number), add_item (field: itemId OR pool: [itemIds], value: qty, target: player/all_players), spawn_enemy (value: configId, qty: N), broadcast_message (value: short friendly text), set_weather (value: clear/rain/storm).

Generate a ModConfig JSON with:
- name: short creative Polish name (max 40 chars)
- description: one sentence in Polish what this mod does
- monsterVariants: 0–3 new enemy variants. Each: id, name, baseSprite:"hunter", tint (NUMBER e.g. 16711680), scale (0.4–4.0), hp, maxHp, damage, dropTable (array or []), optional particleEffect.
- foodVariants: 0–2 food overrides. Each: id, optional hungerRestore, optional hpRestore.
- rules: 0–3 rules. Each: id (snake_case), trigger, optional intervalMs, conditions (array), effects (array).

LANGUAGE: All broadcast_message values and the mod name/description must use simple friendly Polish that a 10-year-old understands. No jargon.
CRITICAL: The mod name and description must describe what you ACTUALLY generated (the feasible version), NOT the player's original impossible request. If the player asked for a dragon but you made a giant fire hunter, name it after the fire hunter — never use words like "dragon", "zipper dragon", etc. if those things don't exist in the game.
IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation. tint must be a NUMBER (e.g. 16711680 not "0xff0000").`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const description: string = body.description ?? "";
  const questions: string[] = body.questions ?? [];
  const answers: string[] = body.answers ?? [];
  const language: string = body.language ?? "pl";

  const userMessage = [
    `Mod description: ${description}`,
    ...questions.map((q: string, i: number) => `Q: ${q}\nA: ${answers[i] ?? ""}`),
    `Language preference: ${language}`,
  ].join("\n\n");

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";

  let config: ModConfig;
  try {
    const jsonText = raw.startsWith("{") ? raw : (raw.match(/\{[\s\S]*\}/)?.[0] ?? "");
    config = JSON.parse(jsonText);
    if (!config.name || !Array.isArray(config.monsterVariants) || !Array.isArray(config.rules)) {
      throw new Error("Invalid ModConfig shape");
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse ModConfig from Claude", raw }, { status: 500 });
  }

  // Look up player UUID from Clerk userId
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const { data: saved, error: dbError } = await supabase
    .from("mod_configs")
    .insert({ created_by: player?.id ?? null, config, status: "pending" })
    .select("id")
    .single();

  if (dbError) {
    // Return config even if DB save fails — user can still see it
    console.error("[forge/generate] DB save failed:", dbError.message);
    return NextResponse.json({ modId: null, config });
  }

  return NextResponse.json({ modId: saved.id, config });
}
