import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset } from "@/db/schema";
import { eq, count, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const status = searchParams.get("status") ?? "Aktif";
  const kategori = searchParams.get("kategori") ?? null;
  const tipe = searchParams.get("tipe") ?? null;
  const lokasi = searchParams.get("lokasi") ?? null;
  const jadwal = searchParams.get("jadwal") ?? null;
  const offset = (page - 1) * limit;

  const conditions = [eq(masterAset.status, status)];
  if (kategori) conditions.push(eq(masterAset.kategori, kategori));
  if (tipe) conditions.push(eq(masterAset.tipe, tipe));
  if (lokasi) conditions.push(eq(masterAset.lokasiGedung, lokasi));
  if (jadwal) conditions.push(eq(masterAset.statusJadwal, jadwal));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

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
