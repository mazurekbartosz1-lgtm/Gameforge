import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

const MAX_VOTES_PER_WEEK = 3;

/** GET /api/forge/votes/remaining — weekly votes left for current user */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ weeklyRemaining: 0 });

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!player) return NextResponse.json({ weeklyRemaining: MAX_VOTES_PER_WEEK });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("player_id", player.id)
    .gte("created_at", weekAgo);

  return NextResponse.json({ weeklyRemaining: Math.max(0, MAX_VOTES_PER_WEEK - (count ?? 0)) });
}
