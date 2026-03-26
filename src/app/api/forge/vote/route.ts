import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

const VOTE_THRESHOLD = 1; // TODO: change to 3 before production
const MAX_VOTES_PER_WEEK = 3;

/** POST /api/forge/vote — cast a vote on a mod */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { modId } = body;
  if (!modId) return NextResponse.json({ error: "modId is required" }, { status: 400 });

  // Get current player
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Check weekly vote limit
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: weeklyCount } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("player_id", player.id)
    .gte("created_at", weekAgo);

  if ((weeklyCount ?? 0) >= MAX_VOTES_PER_WEEK) {
    return NextResponse.json({ error: "Weekly vote limit reached" }, { status: 429 });
  }

  // Insert vote (unique constraint handles double-vote)
  const { error: insertError } = await supabase
    .from("votes")
    .insert({ mod_id: modId, player_id: player.id });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Already voted" }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Increment vote counter on mod
  const { data: mod } = await supabase
    .from("mod_configs")
    .select("votes, status, created_by, config")
    .eq("id", modId)
    .single();

  if (!mod) return NextResponse.json({ error: "Mod not found" }, { status: 404 });

  const newVotes = (mod.votes ?? 0) + 1;
  const nowApproved = mod.status === "submitted" && newVotes >= VOTE_THRESHOLD;

  await supabase
    .from("mod_configs")
    .update({ votes: newVotes, ...(nowApproved ? { status: "approved" } : {}) })
    .eq("id", modId);

  // Notify mod author (skip if voting on own mod)
  if (mod.created_by && mod.created_by !== player.id) {
    const { data: author } = await supabase
      .from("players")
      .select("clerk_id")
      .eq("id", mod.created_by)
      .single();

    if (author?.clerk_id) {
      await supabase.from("notifications").insert({
        recipient_id: mod.created_by,
        type: "mod_voted",
        payload: {
          modId,
          modName: mod.config?.name ?? "Mod",
          approved: nowApproved,
        },
      });
    }
  }

  return NextResponse.json({ votes: newVotes, approved: nowApproved });
}
