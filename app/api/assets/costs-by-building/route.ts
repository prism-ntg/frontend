import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset, asetKomplain } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month"); // 1–12, optional

  if (searchParams.get("years") === "1") {
    const rows = await db
      .selectDistinct({ year: sql<number>`YEAR(${asetKomplain.tanggalSelesai})` })
      .from(asetKomplain)
      .where(sql`${asetKomplain.tanggalSelesai} IS NOT NULL`)
      .orderBy(sql`YEAR(${asetKomplain.tanggalSelesai}) DESC`);
    return NextResponse.json({ years: rows.map(r => String(r.year)).filter(Boolean) });
  }

  let dateFilter;
  if (yearParam && monthParam) {
    dateFilter = sql`YEAR(${asetKomplain.tanggalSelesai}) = ${Number(yearParam)} AND MONTH(${asetKomplain.tanggalSelesai}) = ${Number(monthParam)}`;
  } else if (yearParam) {
    dateFilter = sql`YEAR(${asetKomplain.tanggalSelesai}) = ${Number(yearParam)}`;
  } else {
    dateFilter = sql`${asetKomplain.tanggalSelesai} IS NOT NULL`;
  }

  const rows = await db
    .select({
      gedung: masterAset.lokasiGedung,
      totalBiayaPerbaikan: sql<number>`COALESCE(SUM(${asetKomplain.biayaPerbaikan}), 0)`,
      totalKomplain: sql<number>`COUNT(${asetKomplain.id})`,
    })
    .from(asetKomplain)
    .innerJoin(masterAset, eq(asetKomplain.idAset, masterAset.idAset))
    .where(dateFilter)
    .groupBy(masterAset.lokasiGedung)
    .orderBy(sql`COALESCE(SUM(${asetKomplain.biayaPerbaikan}), 0) DESC`);

  return NextResponse.json({
    data: rows
      .filter(r => r.gedung != null)
      .map(r => ({
        gedung: r.gedung as string,
        totalBiayaPerbaikan: Number(r.totalBiayaPerbaikan),
        totalKomplain: Number(r.totalKomplain),
      })),
  });
}
