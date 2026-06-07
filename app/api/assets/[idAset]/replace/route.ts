import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { riwayatPenggantianAset, masterAset } from "@/db/schema";
import { eq, or, inArray, desc, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const idAsetInt = parseInt(decodeURIComponent(idAset), 10);
  if (isNaN(idAsetInt)) return NextResponse.json({ total: 0, data: [] });

  // Traverse the replacement chain backwards to collect all ancestor IDs
  const chainIds: number[] = [idAsetInt];
  let cursor = idAsetInt;
  for (let i = 0; i < 20; i++) {
    const [pred] = await db
      .select({ idAsetLama: riwayatPenggantianAset.idAsetLama })
      .from(riwayatPenggantianAset)
      .where(eq(riwayatPenggantianAset.idAsetBaru, cursor))
      .limit(1);
    if (!pred) break;
    chainIds.push(pred.idAsetLama);
    cursor = pred.idAsetLama;
  }

  const logs = await db
    .select({
      id: riwayatPenggantianAset.id,
      idAsetLama: riwayatPenggantianAset.idAsetLama,
      namaAsetLama: riwayatPenggantianAset.namaAsetLama,
      kategori: riwayatPenggantianAset.kategori,
      tipe: riwayatPenggantianAset.tipe,
      idAsetBaru: riwayatPenggantianAset.idAsetBaru,
      namaAsetBaru: masterAset.nama,
      merekAsetBaru: masterAset.merek,
      modelAsetBaru: masterAset.model,
      tanggalPenggantian: riwayatPenggantianAset.tanggalPenggantian,
      alasanPenggantian: riwayatPenggantianAset.alasanPenggantian,
      biayaPenggantian: riwayatPenggantianAset.biayaPenggantian,
    })
    .from(riwayatPenggantianAset)
    .leftJoin(masterAset, eq(riwayatPenggantianAset.idAsetBaru, masterAset.idAset))
    .where(
      or(
        inArray(riwayatPenggantianAset.idAsetLama, chainIds),
        inArray(riwayatPenggantianAset.idAsetBaru, chainIds),
      )
    )
    .orderBy(desc(riwayatPenggantianAset.tanggalPenggantian));

  return NextResponse.json({ total: logs.length, data: logs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const idAsetLama = parseInt(decodeURIComponent(idAset), 10);
  if (isNaN(idAsetLama)) {
    return NextResponse.json({ message: "Invalid asset ID" }, { status: 400 });
  }

  const body = await req.json();
  const { prefix, tanggalPenggantian, alasanPenggantian, biayaPenggantian } = body;

  if (!prefix?.trim()) {
    return NextResponse.json({ message: "Prefix nama aset baru wajib diisi" }, { status: 400 });
  }

  try {
    const [oldAsset] = await db
      .select()
      .from(masterAset)
      .where(eq(masterAset.idAset, idAsetLama))
      .limit(1);

    if (!oldAsset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    const [maxRow] = await db.select({ max: sql<number>`MAX(id_aset)` }).from(masterAset);
    const newIdAset = (maxRow.max ?? 0) + 1;
    const newNama = `${prefix.trim()}-${newIdAset}`;

    // 1. Insert new asset (copy old, override id/nama/tglInstalasi)
    await db.insert(masterAset).values({
      idAset: newIdAset,
      nama: newNama,
      merek: oldAsset.merek,
      model: oldAsset.model,
      kategori: oldAsset.kategori,
      subKategori: oldAsset.subKategori,
      tipe: oldAsset.tipe,
      tglInstalasi: tanggalPenggantian || null,
      lokasiGedung: oldAsset.lokasiGedung,
      lokasiLantai: oldAsset.lokasiLantai,
      lokasiZona: oldAsset.lokasiZona,
      kekritisan: oldAsset.kekritisan,
      status: "Aktif",
      statusJadwal: oldAsset.statusJadwal,
    });

    // 2. Move maintenance history to new asset (FK target now exists)
    await db.execute(
      sql`UPDATE aset_komplain SET id_aset = ${newIdAset} WHERE id_aset = ${idAsetLama}`
    );

    // 3. Mark old asset as replaced
    await db.update(masterAset).set({ status: "Diganti" }).where(eq(masterAset.idAset, idAsetLama));

    // 4. Log replacement
    await db.insert(riwayatPenggantianAset).values({
      idAsetLama,
      namaAsetLama: oldAsset.nama,
      kategori: oldAsset.kategori,
      tipe: oldAsset.tipe,
      idAsetBaru: newIdAset,
      tanggalPenggantian: tanggalPenggantian || null,
      alasanPenggantian: alasanPenggantian || null,
      biayaPenggantian: biayaPenggantian != null ? Number(biayaPenggantian) : null,
    });

    return NextResponse.json({ message: "Replacement saved", newIdAset, newNama });
  } catch (err) {
    console.error("[POST /api/assets/[idAset]/replace]", err);
    return NextResponse.json({ message: "Failed to save replacement" }, { status: 500 });
  }
}
