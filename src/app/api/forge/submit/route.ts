import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

/** POST /api/forge/submit — submit a mod to a group vote */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { modId, groupId } = await req.json();
  if (!modId || !groupId) {
    return NextResponse.json({ error: "modId and groupId are required" }, { status: 400 });
  }

  // Verify mod belongs to the current player
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { data: mod, error: modErr } = await supabase
    .from("mod_configs")
    .select("id, config, status")
    .eq("id", modId)
    .eq("created_by", player.id)
    .single();

  if (modErr || !mod) return NextResponse.json({ error: "Mod not found" }, { status: 404 });
  if (mod.status === "submitted") return NextResponse.json({ error: "Mod already submitted" }, { status: 400 });

  const { error } = await supabase
    .from("mod_configs")
    .update({ group_id: groupId, status: "submitted" })
    .eq("id", modId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cfg = mod.config as { name: string; description: string };
  return NextResponse.json({ ok: true, name: cfg.name, description: cfg.description });
}
