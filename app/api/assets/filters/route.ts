import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const [kategoriRows, tipeRows, lokasiRows, jadwalRows, merekRows, subKategoriRows, lantaiRows] = await Promise.all([
      db.selectDistinct({ value: masterAset.kategori }).from(masterAset).where(sql`${masterAset.kategori} IS NOT NULL`).orderBy(masterAset.kategori),
      db.selectDistinct({ value: masterAset.tipe }).from(masterAset).where(sql`${masterAset.tipe} IS NOT NULL`).orderBy(masterAset.tipe),
      db.selectDistinct({ value: masterAset.lokasiGedung }).from(masterAset).where(sql`${masterAset.lokasiGedung} IS NOT NULL`).orderBy(masterAset.lokasiGedung),
      db.selectDistinct({ value: masterAset.statusJadwal }).from(masterAset).where(sql`${masterAset.statusJadwal} IS NOT NULL`).orderBy(masterAset.statusJadwal),
      db.selectDistinct({ value: masterAset.merek }).from(masterAset).where(sql`${masterAset.merek} IS NOT NULL`).orderBy(masterAset.merek),
      db.selectDistinct({ value: masterAset.subKategori }).from(masterAset).where(sql`${masterAset.subKategori} IS NOT NULL`).orderBy(masterAset.subKategori),
      db.selectDistinct({ value: masterAset.lokasiLantai }).from(masterAset).where(sql`${masterAset.lokasiLantai} IS NOT NULL`).orderBy(masterAset.lokasiLantai),
    ]);

    return NextResponse.json({
      kategori: kategoriRows.map((r) => r.value).filter(Boolean),
      tipe: tipeRows.map((r) => r.value).filter(Boolean),
      lokasi: lokasiRows.map((r) => r.value).filter(Boolean),
      jadwal: jadwalRows.map((r) => r.value).filter(Boolean),
      merek: merekRows.map((r) => r.value).filter(Boolean),
      subKategori: subKategoriRows.map((r) => r.value).filter(Boolean),
      lokasiLantai: lantaiRows.map((r) => r.value).filter(Boolean),
    });
  } catch (err) {
    console.error("[/api/assets/filters] Error:", err);
    return NextResponse.json({ message: "Failed to fetch filters" }, { status: 500 });
  }
}
