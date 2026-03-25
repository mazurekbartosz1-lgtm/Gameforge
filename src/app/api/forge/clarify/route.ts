import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
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

  const systemPrompt = `You are a game designer assistant for a 2D survival multiplayer game called Gameforge.
The game has: players, enemies (hunter variants with tint/particle effects), food items (mushroom, berries, raw_meat, cooked_meat), buildings (bonfire, cooking_pot), and a day/night cycle.
The AI modification system can change: monster variants (baseSprite, tint color, particle effect, hp, damage), food variants (hunger/HP values, spawn conditions), game parameters (spawn rate, hunger drain rate, day duration), and rules (event triggers with conditions and effects like spawning enemies, buffing players, broadcasting messages).
Your job: ask exactly 3 SHORT clarifying questions to better understand what kind of game modification the player wants. Questions should help clarify: what exactly changes, when it happens, and how strong the effect should be.
Reply in ${language === "pl" ? "Polish" : "English"}.
Respond with ONLY a valid JSON array of exactly 3 question strings, nothing else. Example: ["Question 1?", "Question 2?", "Question 3?"]`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: "user", content: description }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";

  let questions: string[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 3) throw new Error("bad format");
    questions = parsed.map((q: unknown) => String(q));
  } catch {
    // Fallback: try to extract JSON array from the response text
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json({ error: "Failed to parse Claude response" }, { status: 500 });
    }
    questions = JSON.parse(match[0]);
  }

  return NextResponse.json({ questions });
}
