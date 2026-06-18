import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain, masterAset } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

function parseId(raw: string) {
  const n = parseInt(decodeURIComponent(raw), 10);
  return isNaN(n) ? null : n;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ticketId = parseId(id);
  if (!ticketId) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

  const [ticket] = await db
    .select({
      id: asetKomplain.id,
      idAset: asetKomplain.idAset,
      nama: asetKomplain.nama,
      lokasiGedung: masterAset.lokasiGedung,
      lokasiLantai: masterAset.lokasiLantai,
      lokasiZona: masterAset.lokasiZona,
      kategori: masterAset.kategori,
      subKategori: masterAset.subKategori,
      tipe: masterAset.tipe,
      merek: masterAset.merek,
      tanggalPerencanaan: asetKomplain.tanggalPerencanaan,
      tanggalPengerjaan: asetKomplain.tanggalPengerjaan,
      tanggalSelesai: asetKomplain.tanggalSelesai,
      jenisKerusakan: asetKomplain.jenisKerusakan,
      severity: asetKomplain.severity,
      severityScore: asetKomplain.severityScore,
      penyebab: asetKomplain.penyebab,
      biayaPerbaikan: asetKomplain.biayaPerbaikan,
      sparePartDigunakan: asetKomplain.sparePartDigunakan,
      teknisiPelaksana: asetKomplain.teknisiPelaksana,
      ticketStatus: asetKomplain.ticketStatus,
      assignedUserId: asetKomplain.assignedUserId,
    })
    .from(asetKomplain)
    .leftJoin(masterAset, eq(asetKomplain.idAset, masterAset.idAset))
    .where(eq(asetKomplain.id, ticketId))
    .limit(1);

  if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

  // Teknisi can only see their own ticket
  if (authUser.role === "teknisi" && ticket.assignedUserId !== authUser.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ data: ticket });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ticketId = parseId(id);
  if (!ticketId) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

  const [ticket] = await db
    .select({ id: asetKomplain.id, assignedUserId: asetKomplain.assignedUserId, ticketStatus: asetKomplain.ticketStatus })
    .from(asetKomplain)
    .where(eq(asetKomplain.id, ticketId))
    .limit(1);

  if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
  if (authUser.role === "teknisi" && ticket.assignedUserId !== authUser.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (ticket.ticketStatus === "completed") {
    return NextResponse.json({ message: "Ticket is already completed" }, { status: 409 });
  }

  const body = await req.json();
  const {
    tanggalPengerjaan,
    jenisKerusakan,
    severity,
    severityScore,
    penyebab,
    biayaPerbaikan,
    sparePartDigunakan,
    teknisiPelaksana,
  } = body;

  await db.update(asetKomplain).set({
    tanggalPengerjaan: tanggalPengerjaan || null,
    jenisKerusakan: jenisKerusakan || null,
    severity: severity || null,
    severityScore: severityScore != null ? Number(severityScore) : null,
    penyebab: penyebab || null,
    biayaPerbaikan: biayaPerbaikan != null ? Number(biayaPerbaikan) : null,
    sparePartDigunakan: sparePartDigunakan || null,
    teknisiPelaksana: teknisiPelaksana || null,
    ticketStatus: "in_progress",
  }).where(eq(asetKomplain.id, ticketId));

  return NextResponse.json({ message: "Ticket updated" });
}
