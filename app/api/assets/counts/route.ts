import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset } from "@/db/schema";
import { eq, count, and, like, or } from "drizzle-orm";

// Returns asset counts per risk level (kekritisan) for the active filter set,
// ignoring the kekritisan filter itself so every risk tab can show its own total.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "Aktif";
  const kategori = searchParams.get("kategori") ?? null;
  const tipe = searchParams.get("tipe") ?? null;
  const lokasi = searchParams.get("lokasi") ?? null;
  const jadwal = searchParams.get("jadwal") ?? null;
  const search = searchParams.get("search") ?? null;

  const conditions = [eq(masterAset.status, status)];
  if (kategori) conditions.push(eq(masterAset.kategori, kategori));
  if (tipe) conditions.push(eq(masterAset.tipe, tipe));
  if (lokasi) conditions.push(eq(masterAset.lokasiGedung, lokasi));
  if (jadwal) conditions.push(eq(masterAset.statusJadwal, jadwal));
  if (search) {
    conditions.push(
      or(
        like(masterAset.idAset, `%${search}%`),
        like(masterAset.tipe, `%${search}%`),
        like(masterAset.nama, `%${search}%`),
      )!
    );
  }

  const where = and(...conditions);

  const rows = await db
    .select({ kekritisan: masterAset.kekritisan, c: count() })
    .from(masterAset)
    .where(where)
    .groupBy(masterAset.kekritisan);

  const counts = { all: 0, Critical: 0, Major: 0, Minor: 0, Healthy: 0 };
  for (const row of rows) {
    const key = row.kekritisan && row.kekritisan in counts ? row.kekritisan : "Healthy";
    counts[key as keyof typeof counts] += row.c;
    counts.all += row.c;
  }

  return NextResponse.json(counts);
}
