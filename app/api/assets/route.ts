import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset } from "@/db/schema";
import { sql, eq, count, and, like, or, isNull } from "drizzle-orm";

const latestSeverityExpr = sql<string | null>`(
  SELECT ak.severity
  FROM aset_komplain ak
  WHERE ak.id_aset = master_aset.id_aset
  ORDER BY ISNULL(ak.tanggal_selesai), ak.tanggal_selesai DESC, ak.id DESC
  LIMIT 1
)`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const statusParam = searchParams.get("status") ?? "Aktif";
  const kategori = searchParams.get("kategori") ?? null;
  const tipe = searchParams.get("tipe") ?? null;
  const lokasi = searchParams.get("lokasi") ?? null;
  const jadwal = searchParams.get("jadwal") ?? null;
  const kekritisan = searchParams.get("kekritisan") ?? null;
  const severity = searchParams.get("severity") ?? null; // Fatal | AtRisk | Healthy
  const search = searchParams.get("search") ?? null;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];

  if (statusParam === "inactive") {
    conditions.push(sql`${masterAset.status} != 'Aktif'` as ReturnType<typeof eq>);
  } else {
    conditions.push(eq(masterAset.status, statusParam));
  }

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
      )! as ReturnType<typeof eq>
    );
  }

  // Severity tab filter (based on latest severity from aset_komplain)
  if (severity === "Fatal") {
    conditions.push(
      sql`(SELECT ak.severity FROM aset_komplain ak WHERE ak.id_aset = master_aset.id_aset ORDER BY ISNULL(ak.tanggal_selesai), ak.tanggal_selesai DESC, ak.id DESC LIMIT 1) = 'Fatal'` as ReturnType<typeof eq>
    );
  } else if (severity === "AtRisk") {
    conditions.push(
      sql`(SELECT ak.severity FROM aset_komplain ak WHERE ak.id_aset = master_aset.id_aset ORDER BY ISNULL(ak.tanggal_selesai), ak.tanggal_selesai DESC, ak.id DESC LIMIT 1) IN ('Berat', 'Sedang')` as ReturnType<typeof eq>
    );
  } else if (severity === "Healthy") {
    conditions.push(
      sql`((SELECT ak.severity FROM aset_komplain ak WHERE ak.id_aset = master_aset.id_aset ORDER BY ISNULL(ak.tanggal_selesai), ak.tanggal_selesai DESC, ak.id DESC LIMIT 1) = 'Ringan' OR (SELECT ak.severity FROM aset_komplain ak WHERE ak.id_aset = master_aset.id_aset ORDER BY ISNULL(ak.tanggal_selesai), ak.tanggal_selesai DESC, ak.id DESC LIMIT 1) IS NULL)` as ReturnType<typeof eq>
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(masterAset)
    .where(where);

  const rows = await db
    .select({
      id: masterAset.id,
      idAset: masterAset.idAset,
      nama: masterAset.nama,
      merek: masterAset.merek,
      model: masterAset.model,
      kategori: masterAset.kategori,
      subKategori: masterAset.subKategori,
      tipe: masterAset.tipe,
      tglInstalasi: masterAset.tglInstalasi,
      lokasiGedung: masterAset.lokasiGedung,
      lokasiLantai: masterAset.lokasiLantai,
      lokasiZona: masterAset.lokasiZona,
      kekritisan: masterAset.kekritisan,
      status: masterAset.status,
      statusJadwal: masterAset.statusJadwal,
      confidence: masterAset.confidence,
      lastPredictedAt: masterAset.lastPredictedAt,
      latestSeverity: latestSeverityExpr,
    })
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
