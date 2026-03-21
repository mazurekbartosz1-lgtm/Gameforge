import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function scanPngs(dir: string, publicRoot: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        results.push(...scanPngs(full, publicRoot));
      } else if (e.name.toLowerCase().endsWith(".png")) {
        // URL path relative to public root, with forward slashes
        const rel = "/" + path.relative(publicRoot, full).replace(/\\/g, "/");
        results.push(rel);
      }
    }
  } catch {
    // ignore unreadable dirs
  }
  return results;
}

export async function GET() {
  const publicRoot = path.join(process.cwd(), "public");
  const assetsDir = path.join(publicRoot, "assets");
  const files = scanPngs(assetsDir, publicRoot);
  return NextResponse.json({ files });
}
