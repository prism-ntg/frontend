import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const [row] = await db.select({ max: sql<number>`MAX(id_aset)` }).from(masterAset);
  return NextResponse.json({ nextId: (row.max ?? 0) + 1 });
}
