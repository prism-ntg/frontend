import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain, masterAset } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

function parseId(raw: string): number | null {
  const n = parseInt(decodeURIComponent(raw), 10);
  return isNaN(n) ? null : n;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ idAset: string }> },
) {
  const { idAset } = await params;
  const id = parseId(idAset);
  if (id === null) return NextResponse.json({ message: "Invalid asset ID" }, { status: 400 });

  const body = await req.json();
  const {
    tanggalSelesai,
    jenisKerusakan,
    penyebab,
    severity,
    severityScore,
    biayaPerbaikan,
    sparePartDigunakan,
    teknisiPelaksana,
  } = body;

  if (!tanggalSelesai) {
    return NextResponse.json({ message: "Completion date is required" }, { status: 400 });
  }

  try {
    // Find the most recent open ticket (no tanggalSelesai)
    const [openTicket] = await db
      .select({ id: asetKomplain.id })
      .from(asetKomplain)
      .where(and(eq(asetKomplain.idAset, id), isNull(asetKomplain.tanggalSelesai)))
      .orderBy(desc(asetKomplain.id))
      .limit(1);

    if (!openTicket) {
      return NextResponse.json({ message: "No open maintenance ticket found" }, { status: 404 });
    }

    await db
      .update(asetKomplain)
      .set({
        tanggalSelesai,
        jenisKerusakan: jenisKerusakan || null,
        penyebab: penyebab || null,
        severity: severity || null,
        severityScore: severityScore != null ? Number(severityScore) : null,
        biayaPerbaikan: biayaPerbaikan != null ? Number(biayaPerbaikan) : null,
        sparePartDigunakan: sparePartDigunakan || null,
        teknisiPelaksana: teknisiPelaksana || null,
      })
      .where(eq(asetKomplain.id, openTicket.id));

    await db
      .update(masterAset)
      .set({ status: "Aktif" })
      .where(eq(masterAset.idAset, id));

    return NextResponse.json({ message: "Maintenance completed" });
  } catch (err) {
    console.error("[POST /api/assets/[idAset]/finish-maintenance]", err);
    return NextResponse.json({ message: "Failed to complete maintenance" }, { status: 500 });
  }
}
