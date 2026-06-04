import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset, asetKomplain } from "@/db/schema";
import { eq, count, and, sql, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const [
    [totalRow],
    kekritisanRows,
    jadwalRows,
    kategoriRows,
    topAssetRows,
    maintenanceRows,
    [recentRow],
  ] = await Promise.all([
    db.select({ total: count() })
      .from(masterAset)
      .where(eq(masterAset.status, "Aktif")),

    db.select({ kekritisan: masterAset.kekritisan, total: count() })
      .from(masterAset)
      .where(eq(masterAset.status, "Aktif"))
      .groupBy(masterAset.kekritisan),

    db.select({ jadwal: masterAset.statusJadwal, total: count() })
      .from(masterAset)
      .where(eq(masterAset.status, "Aktif"))
      .groupBy(masterAset.statusJadwal),

    db.select({ kategori: masterAset.kategori, total: count() })
      .from(masterAset)
      .where(eq(masterAset.status, "Aktif"))
      .groupBy(masterAset.kategori)
      .orderBy(sql`count(*) DESC`)
      .limit(5),

    db.select({
      idAset: masterAset.idAset,
      tipe: masterAset.tipe,
      lokasiGedung: masterAset.lokasiGedung,
      lokasiZona: masterAset.lokasiZona,
      kekritisan: masterAset.kekritisan,
      statusJadwal: masterAset.statusJadwal,
    })
      .from(masterAset)
      .where(and(eq(masterAset.status, "Aktif"), isNotNull(masterAset.kekritisan)))
      .orderBy(
        sql`CASE kekritisan WHEN 'Critical' THEN 1 WHEN 'Major' THEN 2 WHEN 'Minor' THEN 3 ELSE 4 END`
      )
      .limit(6),

    db.select({
      month: sql<string>`DATE_FORMAT(tanggal_pengerjaan, '%Y-%m')`,
      total: count(),
    })
      .from(asetKomplain)
      .where(
        and(
          isNotNull(asetKomplain.tanggalPengerjaan),
          sql`tanggal_pengerjaan >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`
        )
      )
      .groupBy(sql`DATE_FORMAT(tanggal_pengerjaan, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(tanggal_pengerjaan, '%Y-%m') ASC`),

    db.select({ total: count() })
      .from(masterAset)
      .where(
        and(
          eq(masterAset.status, "Aktif"),
          sql`created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        )
      ),
  ]);

  let critical = 0, atRisk = 0, healthy = 0;
  for (const r of kekritisanRows) {
    if (r.kekritisan === "Critical") critical = r.total;
    else if (r.kekritisan === "Major" || r.kekritisan === "Minor") atRisk += r.total;
    else healthy += r.total;
  }

  const jadwal: Record<string, number> = {
    Harian: 0, Mingguan: 0, Bulanan: 0, Tahunan: 0, Reactive: 0,
  };
  for (const r of jadwalRows) {
    const key = r.jadwal ?? "Reactive";
    if (key in jadwal) jadwal[key] += r.total;
    else jadwal.Reactive += r.total;
  }

  return NextResponse.json({
    total: totalRow.total,
    recentlyAdded: recentRow.total,
    byKekritisan: { critical, atRisk, healthy },
    byJadwal: jadwal,
    byKategori: kategoriRows.map(r => ({ name: r.kategori ?? "Other", count: r.total })),
    topAssets: topAssetRows,
    maintenanceByMonth: maintenanceRows,
  });
}
