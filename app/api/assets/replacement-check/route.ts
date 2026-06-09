import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { riwayatPenggantianAset, masterAset } from "@/db/schema";
import { like, eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get("prefix") ?? "";

  if (!prefix.trim()) {
    return NextResponse.json({ found: false, data: null });
  }

  const rows = await db
    .select({
      id: riwayatPenggantianAset.id,
      idAsetLama: riwayatPenggantianAset.idAsetLama,
      namaAsetLama: riwayatPenggantianAset.namaAsetLama,
      tanggalPenggantian: riwayatPenggantianAset.tanggalPenggantian,
      alasanPenggantian: riwayatPenggantianAset.alasanPenggantian,
      biayaPenggantian: riwayatPenggantianAset.biayaPenggantian,
    })
    .from(riwayatPenggantianAset)
    .where(like(riwayatPenggantianAset.namaAsetLama, `${prefix}-%`))
    .orderBy(desc(riwayatPenggantianAset.tanggalPenggantian))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ found: false, data: null });
  }

  const record = rows[0];

  // Fetch previous asset details (merek, model) from master_aset
  const [prevAsset] = await db
    .select({ merek: masterAset.merek, model: masterAset.model, nama: masterAset.nama })
    .from(masterAset)
    .where(eq(masterAset.idAset, record.idAsetLama))
    .limit(1);

  return NextResponse.json({
    found: true,
    data: {
      tanggalPenggantian: record.tanggalPenggantian,
      alasanPenggantian: record.alasanPenggantian,
      biayaPenggantian: record.biayaPenggantian,
      prevAssetName: prevAsset?.nama ?? record.namaAsetLama,
      prevManufacturer: prevAsset?.merek ?? "",
      prevModel: prevAsset?.model ?? "",
    },
  });
}
