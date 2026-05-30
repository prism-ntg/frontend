import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const status = searchParams.get("status") ?? null;
  const offset = (page - 1) * limit;

  const where = status ? eq(masterAset.status, status) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(masterAset)
    .where(where);

  const rows = await db
    .select()
    .from(masterAset)
    .where(where)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    total: totalRow.total,
    page,
    limit,
    data: rows,
  });
}
