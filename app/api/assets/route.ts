import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset } from "@/db/schema";
import { eq, count, and, like, or, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const status = searchParams.get("status") ?? "Aktif";
  const kategori = searchParams.get("kategori") ?? null;
  const tipe = searchParams.get("tipe") ?? null;
  const lokasi = searchParams.get("lokasi") ?? null;
  const jadwal = searchParams.get("jadwal") ?? null;
  const kekritisan = searchParams.get("kekritisan") ?? null;
  const search = searchParams.get("search") ?? null;
  const offset = (page - 1) * limit;

  const conditions = [eq(masterAset.status, status)];
  if (kategori) conditions.push(eq(masterAset.kategori, kategori));
  if (tipe) conditions.push(eq(masterAset.tipe, tipe));
  if (lokasi) conditions.push(eq(masterAset.lokasiGedung, lokasi));
  if (jadwal) conditions.push(eq(masterAset.statusJadwal, jadwal));
  if (kekritisan) {
    if (kekritisan === "Healthy") {
      conditions.push(isNull(masterAset.kekritisan));
    } else {
      conditions.push(eq(masterAset.kekritisan, kekritisan));
    }
  }
  if (search) {
    conditions.push(
      or(
        like(masterAset.idAset, `%${search}%`),
        like(masterAset.tipe, `%${search}%`),
        like(masterAset.nama, `%${search}%`),
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(masterAset)
    .where(where);

  const rows = await db
    .select()
    .from(masterAset)
    .where(where)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ total: totalRow.total, page, limit, data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    idAset, nama, merek, kategori, subKategori, tipe,
    tglInstalasi, lokasiGedung, lokasiLantai, lokasiZona,
    kekritisan, statusJadwal,
  } = body;

  if (!idAset) {
    return NextResponse.json({ message: "idAset is required" }, { status: 400 });
  }

  try {
    await db.insert(masterAset).values({
      idAset,
      nama: nama || null,
      merek: merek || null,
      kategori: kategori || null,
      subKategori: subKategori || null,
      tipe: tipe || null,
      tglInstalasi: tglInstalasi || null,
      lokasiGedung: lokasiGedung || null,
      lokasiLantai: lokasiLantai ? String(lokasiLantai) : null,
      lokasiZona: lokasiZona || null,
      kekritisan: kekritisan || null,
      statusJadwal: statusJadwal || null,
      status: "Aktif",
    });
    return NextResponse.json({ message: "Asset created", idAset });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Duplicate") || msg.includes("ER_DUP_ENTRY")) {
      return NextResponse.json({ message: "Asset ID already exists" }, { status: 409 });
    }
    console.error("[POST /api/assets]", err);
    return NextResponse.json({ message: "Failed to create asset" }, { status: 500 });
  }
}
