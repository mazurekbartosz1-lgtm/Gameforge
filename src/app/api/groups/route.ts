import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getPlayerIdByClerk(clerkId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  return data?.id ?? null;
}

// GET /api/groups — list groups the current user belongs to
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playerId = await getPlayerIdByClerk(userId);
  if (!playerId) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("group_members")
    .select("role, groups(id, name, code, creator_id, created_at)")
    .eq("player_id", playerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const groups = (data ?? []).map((row: any) => ({
    ...row.groups,
    role: row.role,
  }));

  return NextResponse.json(groups);
}

// POST /api/groups — create a new group
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playerId = await getPlayerIdByClerk(userId);
  if (!playerId) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  // Generate unique code
  let code = generateCode();
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await supabaseAdmin
      .from("groups")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateCode();
  }

  const { data: group, error: groupError } = await supabaseAdmin
    .from("groups")
    .insert({ name, code, creator_id: playerId })
    .select()
    .single();

  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });

  const { error: memberError } = await supabaseAdmin
    .from("group_members")
    .insert({ group_id: group.id, player_id: playerId, role: "owner" });

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  return NextResponse.json(group, { status: 201 });
}
