import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Railway's healthcheck hits this. It checks Postgres too — an app that boots
// but can't reach the database is not healthy, and a visitor standing at the
// desk is the wrong place to discover that.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("healthcheck: database unreachable", err);
    return NextResponse.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}
