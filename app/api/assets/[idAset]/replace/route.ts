import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { riwayatPenggantianAset } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const decoded = decodeURIComponent(idAset);

  const logs = await db
    .select()
    .from(riwayatPenggantianAset)
    .where(eq(riwayatPenggantianAset.idAsetLama, decoded))
    .orderBy(desc(riwayatPenggantianAset.tanggalPenggantian));

  return NextResponse.json({ total: logs.length, data: logs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const decoded = decodeURIComponent(idAset);
  const body = await req.json();
  const {
    idAsetBaru,
    merekBaru,
    modelBaru,
    tanggalPenggantian,
    alasanPenggantian,
    biayaPenggantian,
    severity,
  } = body;

  try {
    await db.insert(riwayatPenggantianAset).values({
      idAsetLama: decoded,
      idAsetBaru: idAsetBaru || null,
      merekBaru: merekBaru || null,
      modelBaru: modelBaru || null,
      tanggalPenggantian: tanggalPenggantian || null,
      alasanPenggantian: alasanPenggantian || null,
      biayaPenggantian: biayaPenggantian != null ? Number(biayaPenggantian) : null,
      severity: severity || null,
    });
    return NextResponse.json({ message: "Replacement record saved" });
  } catch (err) {
    console.error("[POST /api/assets/[idAset]/replace]", err);
    return NextResponse.json({ message: "Failed to save replacement record" }, { status: 500 });
  }
}
