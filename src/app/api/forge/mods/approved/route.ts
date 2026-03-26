import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

/** GET /api/forge/mods/approved?groupId= — all approved mods for a group (public) */
export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get("groupId");

  let query = supabase
    .from("mod_configs")
    .select("id, config, votes, created_at, players(nickname)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ mods: data ?? [] });
}
