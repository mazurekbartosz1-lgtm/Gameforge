import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const GAME_CONSTRAINTS = `
WHAT IS POSSIBLE IN GAMEFORGE (full list):

ENEMIES:
- Only one base sprite exists: "hunter" (humanoid figure). No dragons, orcs, skeletons, animals — only hunter.
- You CAN change: tint color (any hex), scale (0.4–4.0), particle effect, hp, damage, name, drop table.
- Particle effects (choose one or none): fire (red/orange flames), ice (blue snowflakes), poison (green bubbles), electric (yellow sparks), shadow (dark wisps), holy (white glow).
- Effect behaviours in combat: fire=burn DoT 5dmg/s, ice=slow 50%, poison=DoT 3dmg/s, electric=stun, shadow=lifesteal, holy=bonus damage.

FOOD:
- Existing food items that can be modified: mushroom, berries, raw_meat, cooked_meat.
- You CAN change: hungerRestore, hpRestore, spawnChance. Cannot add entirely new food types.

RULES (event system):
- Triggers: on_tick (every second), every_Ns (timer with intervalMs), on_eat, on_cook, on_hunger_low (hunger<20), on_enemy_death, on_player_join.
- Conditions: player.hunger/hp/sanity compared with </>/>=/==/!=, world.isNight==true, world.weather=="rain"/"storm", item.type=="mushroom" (on_eat), enemy.configId=="hunter" (on_enemy_death), random<0.1 (probability).
- Effects: modify_stat (hp/hunger/sanity, target: player or all_players), add_item (specific item or random from pool, target: player or all_players), spawn_enemy (configId + qty), broadcast_message (text shown to all players), set_weather (clear/rain/storm).

WHAT IS NOT POSSIBLE:
- New base sprites (no dragons, wolves, ghosts, etc.) — suggest a tinted/scaled hunter instead.
- New buildings, new map areas, new player animations.
- Multiplayer mechanics beyond what exists (no guilds, no trading).
`;

const buildSystemPrompt = (language: "pl" | "en") => `You are a friendly game designer assistant for Gameforge — a 2D survival multiplayer game for children aged 10–14.
${GAME_CONSTRAINTS}
YOUR JOB:
1. Read the player's modification request.
2. If the request is impossible (e.g. "add a dragon"), explain briefly in simple ${language === "pl" ? "Polish" : "English"} what you CAN do instead (e.g. "I can't add a dragon, but I can make a huge red hunter with fire effects!"). Put this in the "redirect" field.
3. Ask exactly 3 SHORT clarifying questions about the feasible version. Use simple language a 10-year-old understands. No technical words.

Reply in ${language === "pl" ? "Polish" : "English"}.
Respond with ONLY valid JSON in this exact format:
{"redirect": null, "questions": ["Question 1?", "Question 2?", "Question 3?"]}
If redirecting: {"redirect": "Friendly explanation of what you'll do instead.", "questions": ["Question 1?", "Question 2?", "Question 3?"]}`;

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
  const language: "pl" | "en" = body.language === "en" ? "en" : "pl";

  if (!description.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: buildSystemPrompt(language),
    messages: [{ role: "user", content: description }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";

  let parsed: { redirect: string | null; questions: string[] };
  try {
    const jsonText = raw.startsWith("{") ? raw : (raw.match(/\{[\s\S]*\}/)?.[0] ?? "");
    parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 3) throw new Error("bad format");
  } catch {
    // Fallback: try to extract just the questions array
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json({ error: "Failed to parse Claude response" }, { status: 500 });
    }
    parsed = { redirect: null, questions: JSON.parse(match[0]) };
  }

  return NextResponse.json({
    redirect: parsed.redirect ?? null,
    questions: parsed.questions.map((q: unknown) => String(q)),
  });
}
