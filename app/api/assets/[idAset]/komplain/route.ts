import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;

  const logs = await db
    .select()
    .from(asetKomplain)
    .where(eq(asetKomplain.idAset, decodeURIComponent(idAset)));

  return NextResponse.json({ total: logs.length, data: logs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const decoded = decodeURIComponent(idAset);
  const body = await req.json();
  const { tanggalPerencanaan, tanggalPengerjaan, tanggalSelesai, jenisKerusakan, penyebab, biayaPerbaikan } = body;

  try {
    await db.insert(asetKomplain).values({
      idAset: decoded,
      tanggalPerencanaan: tanggalPerencanaan || null,
      tanggalPengerjaan: tanggalPengerjaan || null,
      tanggalSelesai: tanggalSelesai || null,
      jenisKerusakan: jenisKerusakan || null,
      penyebab: penyebab || null,
      biayaPerbaikan: biayaPerbaikan != null ? Number(biayaPerbaikan) : null,
    });
    return NextResponse.json({ message: "Maintenance record saved" });
  } catch (err) {
    console.error("[POST /api/assets/[idAset]/komplain]", err);
    return NextResponse.json({ message: "Failed to save maintenance record" }, { status: 500 });
  }
}
