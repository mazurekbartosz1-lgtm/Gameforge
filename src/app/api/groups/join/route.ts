import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getPlayerIdByClerk(clerkId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  return data?.id ?? null;
}

// POST /api/groups/join — join a group by code
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playerId = await getPlayerIdByClerk(userId);
  if (!playerId) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const code = (body.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const { data: group, error: groupError } = await supabaseAdmin
    .from("groups")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Check already a member (PK is (player_id, group_id))
  const { data: existing } = await supabaseAdmin
    .from("group_members")
    .select("role")
    .eq("group_id", group.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) return NextResponse.json({ ...group, role: existing.role });

  const { error: memberError } = await supabaseAdmin
    .from("group_members")
    .insert({ group_id: group.id, player_id: playerId, role: "member" });

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  return NextResponse.json({ ...group, role: "member" }, { status: 201 });
}
