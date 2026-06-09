import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset } from "@/db/schema";
import { sql, like } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get("prefix") ?? "";

  const [maxRow] = await db
    .select({ maxId: sql<number>`COALESCE(MAX(${masterAset.idAset}), 0)` })
    .from(masterAset);

  const nextId = (maxRow?.maxId ?? 0) + 1;

  let nameExists = false;
  if (prefix.trim()) {
    const rows = await db
      .select({ id: masterAset.id })
      .from(masterAset)
      .where(like(masterAset.nama, `${prefix}-%`))
      .limit(1);
    nameExists = rows.length > 0;
  }

  return NextResponse.json({ nextId, nameExists });
}
