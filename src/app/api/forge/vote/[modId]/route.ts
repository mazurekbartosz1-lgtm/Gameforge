import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

/** GET /api/forge/vote/[modId] — check vote status for the current user */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ modId: string }> }
) {
  const { modId } = await params;
  const { userId } = await auth();

  // Get total vote count from mod_configs
  const { data: mod } = await supabase
    .from("mod_configs")
    .select("votes")
    .eq("id", modId)
    .single();

  const count = mod?.votes ?? 0;

  // If not logged in, just return count
  if (!userId) return NextResponse.json({ voted: false, count });

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!player) return NextResponse.json({ voted: false, count });

  const { data: vote } = await supabase
    .from("votes")
    .select("id")
    .eq("mod_id", modId)
    .eq("player_id", player.id)
    .maybeSingle();

  // Check weekly votes remaining
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: weeklyCount } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("player_id", player.id)
    .gte("created_at", weekAgo);

  return NextResponse.json({
    voted: !!vote,
    count,
    weeklyRemaining: Math.max(0, 3 - (weeklyCount ?? 0)),
  });
}
