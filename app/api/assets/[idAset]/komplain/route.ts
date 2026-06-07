import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const idAsetInt = parseInt(decodeURIComponent(idAset), 10);
  if (isNaN(idAsetInt)) return NextResponse.json({ total: 0, data: [] });

  const logs = await db
    .select()
    .from(asetKomplain)
    .where(eq(asetKomplain.idAset, idAsetInt))
    .orderBy(desc(asetKomplain.tanggalPengerjaan));

  return NextResponse.json({ total: logs.length, data: logs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const idAsetInt = parseInt(decodeURIComponent(idAset), 10);
  if (isNaN(idAsetInt)) {
    return NextResponse.json({ message: "Invalid asset ID" }, { status: 400 });
  }
  const body = await req.json();
  const {
    maintenanceType,
    tanggalPerencanaan,
    tanggalPengerjaan,
    tanggalSelesai,
    jenisKerusakan,
    penyebab,
    biayaPerbaikan,
    severity,
    severityScore,
    sparePartDigunakan,
    teknisiPelaksana,
  } = body;

  try {
    await db.insert(asetKomplain).values({
      idAset: idAsetInt,
      maintenanceType: maintenanceType || null,
      tanggalPerencanaan: tanggalPerencanaan || null,
      tanggalPengerjaan: tanggalPengerjaan || null,
      tanggalSelesai: tanggalSelesai || null,
      jenisKerusakan: jenisKerusakan || null,
      penyebab: penyebab || null,
      biayaPerbaikan: biayaPerbaikan != null ? Number(biayaPerbaikan) : null,
      severity: severity || null,
      severityScore: severityScore != null ? Number(severityScore) : null,
      sparePartDigunakan: sparePartDigunakan || null,
      teknisiPelaksana: teknisiPelaksana || null,
    });
    return NextResponse.json({ message: "Maintenance record saved" });
  } catch (err) {
    console.error("[POST /api/assets/[idAset]/komplain]", err);
    return NextResponse.json({ message: "Failed to save maintenance record" }, { status: 500 });
  }
}
