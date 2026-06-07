import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset, asetKomplain } from "@/db/schema";
import { eq } from "drizzle-orm";

function parseId(raw: string): number | null {
  const n = parseInt(decodeURIComponent(raw), 10);
  return isNaN(n) ? null : n;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const id = parseId(idAset);
  if (id === null) return NextResponse.json({ message: "Invalid asset ID" }, { status: 400 });

  const [asset] = await db
    .select()
    .from(masterAset)
    .where(eq(masterAset.idAset, id));

  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }
  return NextResponse.json(asset);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const id = parseId(idAset);
  if (id === null) return NextResponse.json({ message: "Invalid asset ID" }, { status: 400 });

  const body = await req.json();
  const {
    nama, merek, model, kategori, subKategori, tipe,
    tglInstalasi, lokasiGedung, lokasiLantai, lokasiZona,
    kekritisan, statusJadwal, status,
  } = body;

  try {
    await db
      .update(masterAset)
      .set({
        nama: nama || null,
        merek: merek || null,
        model: model || null,
        kategori: kategori || null,
        subKategori: subKategori || null,
        tipe: tipe || null,
        tglInstalasi: tglInstalasi || null,
        lokasiGedung: lokasiGedung || null,
        lokasiLantai: lokasiLantai ? String(lokasiLantai) : null,
        lokasiZona: lokasiZona || null,
        ...(kekritisan !== undefined && { kekritisan: kekritisan || null }),
        ...(statusJadwal !== undefined && { statusJadwal: statusJadwal || null }),
        ...(status && { status }),
      })
      .where(eq(masterAset.idAset, id));

    return NextResponse.json({ message: "Asset updated" });
  } catch (err) {
    console.error("[PUT /api/assets/[idAset]]", err);
    return NextResponse.json({ message: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const id = parseId(idAset);
  if (id === null) return NextResponse.json({ message: "Invalid asset ID" }, { status: 400 });

  try {
    await db.delete(asetKomplain).where(eq(asetKomplain.idAset, id));
    await db.delete(masterAset).where(eq(masterAset.idAset, id));
    return NextResponse.json({ message: "Asset deleted" });
  } catch (err) {
    console.error("[DELETE /api/assets/[idAset]]", err);
    return NextResponse.json({ message: "Failed to delete asset" }, { status: 500 });
  }
}
