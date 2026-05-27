import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`select 1`;
    return NextResponse.json({ ok: true, service: "shoponline-web", database: "ok", time: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, service: "shoponline-web", database: "error", error: error instanceof Error ? error.message : "unknown" }, { status: 500 });
  }
}
