import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

/** GET /api/groups/[groupId]/players — players who have been in this group (for invite picker) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  // Get all players who have a room state in this group, joined with their profile
  const { data, error } = await supabase
    .from("player_room_states")
    .select("player_id, updated_at, players(id, clerk_id, nickname)")
    .eq("group_id", groupId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Exclude the current user, return id + nickname + clerkId
  const players = (data ?? [])
    .map((row: any) => ({
      id: row.player_id,
      nickname: row.players?.nickname ?? "Player",
      clerkId: row.players?.clerk_id ?? "",
      lastSeen: row.updated_at,
    }))
    .filter((p: any) => p.clerkId !== userId);

  return NextResponse.json({ players });
}
