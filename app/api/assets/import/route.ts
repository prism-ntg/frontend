import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset, asetKomplain } from "@/db/schema";
import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  const text = await file.text();

  let records: Record<string, string>[];
  try {
    records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
  } catch {
    return NextResponse.json({ message: "Invalid CSV format" }, { status: 400 });
  }

  const created: number[] = [];
  const errors: string[] = [];

  function parseDate(val: string | undefined): Date | null {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  const [maxRow] = await db.select({ max: sql<number>`MAX(id_aset)` }).from(masterAset);
  let nextId = (maxRow.max ?? 0) + 1;

  for (const row of records) {
    const idAset = nextId++;

    try {
      await db.insert(masterAset).values({
        idAset,
        kategori: row["Kategori"] || null,
        subKategori: row["Sub_Kategori"] || null,
        tipe: row["Tipe"] || null,
        lokasiGedung: row["Lokasi"] || null,
        tglInstalasi: parseDate(row["Tanggal_Instalasi"]),
        kekritisan: row["Tingkat_Kekritisan"] || null,
        status: "Aktif",
      });

      const biayaPerbaikan = parseFloat(row["Biaya_Perbaikan"]);
      const jenisKerusakan = row["Jenis_Kerusakan"] || null;
      const tanggalPerbaikan = row["Tanggal_Perbaikan"] || null;

      if (jenisKerusakan || !isNaN(biayaPerbaikan) || tanggalPerbaikan) {
        await db.insert(asetKomplain).values({
          idAset: idAset,
          jenisKerusakan,
          biayaPerbaikan: !isNaN(biayaPerbaikan) ? biayaPerbaikan : null,
          tanggalPengerjaan: parseDate(tanggalPerbaikan ?? undefined),
        });
      }

      created.push(idAset);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Duplicate") || msg.includes("ER_DUP_ENTRY")) {
        errors.push(`${idAset}: already exists (skipped)`);
      } else {
        errors.push(`${idAset}: ${msg}`);
      }
    }
  }

  return NextResponse.json({
    message: `Import complete: ${created.length} asset(s) created`,
    created: created.length,
    errors,
  });
}
