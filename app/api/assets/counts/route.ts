import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset } from "@/db/schema";
import { sql, eq, and, like, or } from "drizzle-orm";

// Returns asset counts per severity-based tab (Fatal / At Risk / Healthy)
// based on the latest severity in aset_komplain per asset.
// Ignores the severity filter itself so each tab shows its own real count.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "Aktif";
  const kategori = searchParams.get("kategori") ?? null;
  const tipe = searchParams.get("tipe") ?? null;
  const lokasi = searchParams.get("lokasi") ?? null;
  const jadwal = searchParams.get("jadwal") ?? null;
  const search = searchParams.get("search") ?? null;

  const statusCond =
    status === "inactive"
      ? (sql`${masterAset.status} NOT IN ('Aktif', 'Under Maintenance')` as ReturnType<typeof eq>)
      : eq(masterAset.status, status);
  const conditions: ReturnType<typeof eq>[] = [statusCond];
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
      )! as ReturnType<typeof eq>
    );
  }

  const where = and(...conditions);

  const result = await db
    .select({
      total: sql<number>`COUNT(*)`,
      fatal: sql<number>`SUM(CASE WHEN (
        SELECT ak.severity FROM aset_komplain ak
        WHERE ak.id_aset = master_aset.id_aset
        ORDER BY ISNULL(ak.tanggal_selesai), ak.tanggal_selesai DESC, ak.id DESC LIMIT 1
      ) = 'Fatal' THEN 1 ELSE 0 END)`,
      atRisk: sql<number>`SUM(CASE WHEN (
        SELECT ak.severity FROM aset_komplain ak
        WHERE ak.id_aset = master_aset.id_aset
        ORDER BY ISNULL(ak.tanggal_selesai), ak.tanggal_selesai DESC, ak.id DESC LIMIT 1
      ) IN ('Berat', 'Sedang') THEN 1 ELSE 0 END)`,
      healthy: sql<number>`SUM(CASE WHEN (
        SELECT ak.severity FROM aset_komplain ak
        WHERE ak.id_aset = master_aset.id_aset
        ORDER BY ISNULL(ak.tanggal_selesai), ak.tanggal_selesai DESC, ak.id DESC LIMIT 1
      ) = 'Ringan' OR (
        SELECT ak.severity FROM aset_komplain ak
        WHERE ak.id_aset = master_aset.id_aset
        ORDER BY ISNULL(ak.tanggal_selesai), ak.tanggal_selesai DESC, ak.id DESC LIMIT 1
      ) IS NULL THEN 1 ELSE 0 END)`,
    })
    .from(masterAset)
    .where(where);

  const row = result[0];
  return NextResponse.json({
    all: Number(row?.total ?? 0),
    Fatal: Number(row?.fatal ?? 0),
    AtRisk: Number(row?.atRisk ?? 0),
    Healthy: Number(row?.healthy ?? 0),
  });
}
