import { NextResponse } from "next/server";
import { db } from "@/db";
import { riwayatPenggantianAset, masterAset } from "@/db/schema";
import { eq, desc, like, count, or, and, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit    = Math.min(50, Math.max(10, Number(searchParams.get("limit") ?? 20)));
  const search   = searchParams.get("search")   ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo   = searchParams.get("dateTo")   ?? "";
  const offset   = (page - 1) * limit;

  const conditions = [
    search   ? or(like(riwayatPenggantianAset.namaAsetLama, `%${search}%`), like(riwayatPenggantianAset.kategori, `%${search}%`)) : undefined,
    dateFrom ? gte(riwayatPenggantianAset.tanggalPenggantian, new Date(dateFrom)) : undefined,
    dateTo   ? lte(riwayatPenggantianAset.tanggalPenggantian, new Date(dateTo))   : undefined,
  ].filter(Boolean) as Parameters<typeof and>;

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(riwayatPenggantianAset).where(whereClause),
    db
      .select({
        id: riwayatPenggantianAset.id,
        idAsetLama: riwayatPenggantianAset.idAsetLama,
        namaAsetLama: riwayatPenggantianAset.namaAsetLama,
        kategori: riwayatPenggantianAset.kategori,
        tipe: riwayatPenggantianAset.tipe,
        idAsetBaru: riwayatPenggantianAset.idAsetBaru,
        namaAsetBaru: masterAset.nama,
        tanggalPenggantian: riwayatPenggantianAset.tanggalPenggantian,
        alasanPenggantian: riwayatPenggantianAset.alasanPenggantian,
        biayaPenggantian: riwayatPenggantianAset.biayaPenggantian,
      })
      .from(riwayatPenggantianAset)
      .leftJoin(masterAset, eq(riwayatPenggantianAset.idAsetBaru, masterAset.idAset))
      .where(whereClause)
      .orderBy(desc(riwayatPenggantianAset.tanggalPenggantian))
      .limit(limit)
      .offset(offset),
  ]);

  return NextResponse.json({ total, page, limit, data: rows });
}
