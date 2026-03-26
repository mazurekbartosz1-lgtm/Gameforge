import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** GET /api/me — returns basic info about the current user */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ isAdmin: false });

  const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase() ?? "";
  return NextResponse.json({ isAdmin: ADMIN_EMAILS.includes(email) });
}
