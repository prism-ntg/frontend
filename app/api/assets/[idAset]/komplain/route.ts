import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;

  const logs = await db
    .select()
    .from(asetKomplain)
    .where(eq(asetKomplain.idAset, decodeURIComponent(idAset)));

  return NextResponse.json({ total: logs.length, data: logs });
}
