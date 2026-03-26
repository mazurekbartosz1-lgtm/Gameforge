import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

/** GET /api/notifications — last 20 notifications for the current user */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!player) return NextResponse.json([]);

  const { data } = await supabase
    .from("notifications")
    .select("id, type, payload, read, created_at")
    .eq("recipient_id", player.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json(data ?? []);
}

/** POST /api/notifications — create a notification for a player */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { recipientClerkId, type, payload } = body;

  if (!recipientClerkId || !type) {
    return NextResponse.json({ error: "recipientClerkId and type are required" }, { status: 400 });
  }

  const { data: recipient } = await supabase
    .from("players")
    .select("id")
    .eq("clerk_id", recipientClerkId)
    .single();

  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("notifications")
    .insert({ recipient_id: recipient.id, type, payload: payload ?? {} })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
