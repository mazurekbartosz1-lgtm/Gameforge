import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!player) {
    return NextResponse.json({ mods: [] });
  }

  const { data: mods, error } = await supabase
    .from("mod_configs")
    .select("id, config, status, votes, created_at")
    .eq("created_by", player.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mods: mods ?? [] });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { error } = await supabase
    .from("mod_configs")
    .update({ status: "deleted" })
    .eq("id", id)
    .eq("created_by", player.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
