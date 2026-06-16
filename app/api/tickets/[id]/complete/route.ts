import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain, masterAset, users, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

function parseId(raw: string) {
  const n = parseInt(decodeURIComponent(raw), 10);
  return isNaN(n) ? null : n;
}

const SEVERITY_SCORE: Record<string, number> = {
  Fatal: 4, Berat: 3, Sedang: 2, Ringan: 1,
};

export async function POST(
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
      assignedUserId: asetKomplain.assignedUserId,
      ticketStatus: asetKomplain.ticketStatus,
    })
    .from(asetKomplain)
    .where(eq(asetKomplain.id, ticketId))
    .limit(1);

  if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
  if (authUser.role === "teknisi" && ticket.assignedUserId !== authUser.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (ticket.ticketStatus === "completed") {
    return NextResponse.json({ message: "Ticket already completed" }, { status: 409 });
  }

  const body = await req.json();
  const {
    tanggalSelesai, tanggalPengerjaan, jenisKerusakan, severity,
    penyebab, biayaPerbaikan, sparePartDigunakan, teknisiPelaksana,
  } = body;

  if (!tanggalSelesai) {
    return NextResponse.json({ message: "Tanggal selesai wajib diisi" }, { status: 400 });
  }

  await db.update(asetKomplain).set({
    tanggalPengerjaan: tanggalPengerjaan || null,
    tanggalSelesai,
    jenisKerusakan: jenisKerusakan || null,
    severity: severity || null,
    severityScore: severity ? (SEVERITY_SCORE[severity] ?? null) : null,
    penyebab: penyebab || null,
    biayaPerbaikan: biayaPerbaikan != null ? Number(biayaPerbaikan) : null,
    sparePartDigunakan: sparePartDigunakan || null,
    teknisiPelaksana: teknisiPelaksana || null,
    ticketStatus: "completed",
  }).where(eq(asetKomplain.id, ticketId));

  await db.update(masterAset).set({ status: "Aktif" }).where(eq(masterAset.idAset, ticket.idAset));

  const assetName = ticket.nama ?? `#${ticket.idAset}`;
  const techName = teknisiPelaksana || authUser.email;

  // Notify all admins that maintenance is complete
  const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  if (adminUsers.length > 0) {
    await db.insert(notifications).values(
      adminUsers.map(a => ({
        userId: a.id,
        type: "ticket_completed",
        title: "Maintenance Selesai",
        message: `Aset ${assetName} telah selesai diperbaiki oleh ${techName}.`,
        relatedTicketId: ticketId,
      }))
    );
  }

  // Notify the teknisi (confirmation)
  if (ticket.assignedUserId) {
    await db.insert(notifications).values({
      userId: ticket.assignedUserId,
      type: "ticket_completed",
      title: "Tiket Diselesaikan",
      message: `Tiket maintenance untuk aset ${assetName} telah berhasil diselesaikan.`,
      relatedTicketId: ticketId,
    });
  }

  return NextResponse.json({ message: "Maintenance completed" });
}
