import { NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain, masterAset } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: masterAset.id,
      idAset: masterAset.idAset,
      nama: masterAset.nama,
      kategori: masterAset.kategori,
      tipe: masterAset.tipe,
      lokasiGedung: masterAset.lokasiGedung,
      lokasiLantai: masterAset.lokasiLantai,
      lokasiZona: masterAset.lokasiZona,
      kekritisan: masterAset.kekritisan,
      ticketId: asetKomplain.id,
      tanggalPerencanaan: asetKomplain.tanggalPerencanaan,
      tanggalPengerjaan: asetKomplain.tanggalPengerjaan,
    })
    .from(masterAset)
    .leftJoin(
      asetKomplain,
      and(eq(asetKomplain.idAset, masterAset.idAset), isNull(asetKomplain.tanggalSelesai)),
    )
    .where(eq(masterAset.status, "Under Maintenance"))
    .orderBy(desc(asetKomplain.id));

  // Deduplicate by idAset — keep the row with the latest ticket
  const seen = new Set<number>();
  const data = [];
  for (const row of rows) {
    if (!seen.has(row.idAset)) {
      seen.add(row.idAset);
      data.push(row);
    }
  }

  return NextResponse.json({ data, total: data.length });
}
