import { NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain, masterAset } from "@/db/schema";
import { eq, desc, like, count, and, isNull, or, ne, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit    = Math.min(50, Math.max(10, Number(searchParams.get("limit") ?? 20)));
  const search   = searchParams.get("search")   ?? "";
  const severity = searchParams.get("severity") ?? "";
  const gedung   = searchParams.get("gedung")   ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo   = searchParams.get("dateTo")   ?? "";
  const offset   = (page - 1) * limit;

  // Only show historical records (no ticketStatus) and completed tickets
  const conditions = [
    or(isNull(asetKomplain.ticketStatus), eq(asetKomplain.ticketStatus, "completed")),
  ];
  if (search)   conditions.push(like(asetKomplain.nama, `%${search}%`));
  if (severity) conditions.push(eq(asetKomplain.severity, severity));
  if (gedung)   conditions.push(eq(masterAset.lokasiGedung, gedung));
  if (dateFrom) conditions.push(gte(asetKomplain.tanggalPengerjaan, new Date(dateFrom)));
  if (dateTo)   conditions.push(lte(asetKomplain.tanggalPengerjaan, new Date(dateTo)));

  const whereClause = and(...conditions);

  const [[{ total }], rows, gedungRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(asetKomplain)
      .leftJoin(masterAset, eq(asetKomplain.idAset, masterAset.idAset))
      .where(whereClause),

    db
      .select({
        id:                  asetKomplain.id,
        idAset:              asetKomplain.idAset,
        nama:                asetKomplain.nama,
        lokasiGedung:        masterAset.lokasiGedung,
        tanggalPerencanaan:  asetKomplain.tanggalPerencanaan,
        tanggalPengerjaan:   asetKomplain.tanggalPengerjaan,
        tanggalSelesai:      asetKomplain.tanggalSelesai,
        jenisKerusakan:      asetKomplain.jenisKerusakan,
        penyebab:            asetKomplain.penyebab,
        severity:            asetKomplain.severity,
        severityScore:       asetKomplain.severityScore,
        biayaPerbaikan:      asetKomplain.biayaPerbaikan,
        sparePartDigunakan:  asetKomplain.sparePartDigunakan,
        teknisiPelaksana:    asetKomplain.teknisiPelaksana,
      })
      .from(asetKomplain)
      .leftJoin(masterAset, eq(asetKomplain.idAset, masterAset.idAset))
      .where(whereClause)
      .orderBy(desc(asetKomplain.tanggalPengerjaan))
      .limit(limit)
      .offset(offset),

    // distinct gedung list for filter dropdown (always unfiltered)
    db
      .selectDistinct({ gedung: masterAset.lokasiGedung })
      .from(asetKomplain)
      .leftJoin(masterAset, eq(asetKomplain.idAset, masterAset.idAset)),
  ]);

  const gedungList = gedungRows
    .map(r => r.gedung)
    .filter((g): g is string => g != null)
    .sort();

  return NextResponse.json({ total, page, limit, data: rows, gedungList });
}
