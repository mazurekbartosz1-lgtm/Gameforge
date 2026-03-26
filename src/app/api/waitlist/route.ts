import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: unknown = body?.email;

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from("waitlist")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "already_registered" }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from("waitlist")
    .insert({ email: normalized });

  if (error) {
    console.error("[waitlist] insert error:", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
