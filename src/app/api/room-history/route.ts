import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  let query = supabaseAdmin
    .from("room_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (groupId) query = query.eq("group_id", groupId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
