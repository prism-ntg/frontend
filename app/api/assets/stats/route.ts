import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset, asetKomplain } from "@/db/schema";
import { eq, count, and, sql, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationFilter = searchParams.get("location") || null;

  const [
    [totalRow],
    kekritisanRows,
    jadwalRows,
    kategoriRows,
    topAssetRows,
    maintenanceRows,
    [recentRow],
    severityAssetRows,
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

    // Top assets by complaint count; latest severity via correlated subquery
    db.select({
      idAset: masterAset.idAset,
      nama: masterAset.nama,
      tipe: masterAset.tipe,
      lokasiGedung: masterAset.lokasiGedung,
      kekritisan: masterAset.kekritisan,
      statusJadwal: masterAset.statusJadwal,
      complaintCount: sql<number>`COUNT(aset_komplain.id)`,
      latestSeverity: sql<string | null>`(
        SELECT severity FROM aset_komplain AS sub
        WHERE sub.id_aset = master_aset.id_aset
        ORDER BY ISNULL(sub.tanggal_selesai), sub.tanggal_selesai DESC, sub.id DESC
        LIMIT 1
      )`,
    })
      .from(masterAset)
      .leftJoin(asetKomplain, eq(masterAset.idAset, asetKomplain.idAset))
      .where(locationFilter
        ? and(eq(masterAset.status, "Aktif"), eq(masterAset.lokasiGedung, locationFilter))
        : eq(masterAset.status, "Aktif"))
      .groupBy(
        masterAset.idAset,
        masterAset.nama,
        masterAset.tipe,
        masterAset.lokasiGedung,
        masterAset.kekritisan,
        masterAset.statusJadwal,
      )
      .orderBy(sql`COUNT(aset_komplain.id) DESC`)
      .limit(6),

    // Maintenance activities done — all historical data so any date range works client-side
    db.select({
      month: sql<string>`DATE_FORMAT(tanggal_selesai, '%Y-%m')`,
      total: count(),
    })
      .from(asetKomplain)
      .where(isNotNull(asetKomplain.tanggalSelesai))
      .groupBy(sql`DATE_FORMAT(tanggal_selesai, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(tanggal_selesai, '%Y-%m') ASC`),

    db.select({ total: count() })
      .from(masterAset)
      .where(
        and(
          eq(masterAset.status, "Aktif"),
          sql`created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        )
      ),

    // Count assets by worst complaint severity (LEFT JOIN from master_aset so every asset is considered)
    db.select({
      idAset: masterAset.idAset,
      fatalCount: sql<number>`SUM(CASE WHEN ${asetKomplain.severity} = 'Fatal' THEN 1 ELSE 0 END)`,
      atRiskCount: sql<number>`SUM(CASE WHEN ${asetKomplain.severity} IN ('Berat','Sedang') THEN 1 ELSE 0 END)`,
      healthyCount: sql<number>`SUM(CASE WHEN ${asetKomplain.severity} = 'Ringan' THEN 1 ELSE 0 END)`,
    })
      .from(masterAset)
      .leftJoin(asetKomplain, eq(masterAset.idAset, asetKomplain.idAset))
      .where(eq(masterAset.status, "Aktif"))
      .groupBy(masterAset.idAset)
      .having(sql`COUNT(${asetKomplain.id}) > 0`),
  ]);

  // byKekritisan: Critical / Major / Minor individually (from master_aset)
  let critical = 0, major = 0, minor = 0;
  for (const r of kekritisanRows) {
    if (r.kekritisan === "Critical") critical = r.total;
    else if (r.kekritisan === "Major") major = r.total;
    else if (r.kekritisan === "Minor") minor = r.total;
  }

  // bySeverity: count distinct assets by worst complaint severity
  // Fatal (critical) > Berat/Sedang (at risk) > Ringan (healthy)
  let criticalSev = 0, atRiskSev = 0, healthySev = 0;
  for (const r of severityAssetRows) {
    if (Number(r.fatalCount) > 0) criticalSev++;
    else if (Number(r.atRiskCount) > 0) atRiskSev++;
    else if (Number(r.healthyCount) > 0) healthySev++;
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
    bySeverity: { critical: criticalSev, atRisk: atRiskSev, healthy: healthySev },
    byKekritisan: { critical, major, minor },
    byJadwal: jadwal,
    byKategori: kategoriRows.map(r => ({ name: r.kategori ?? "Other", count: r.total })),
    topAssets: topAssetRows,
    maintenanceByMonth: maintenanceRows,
  });
}
