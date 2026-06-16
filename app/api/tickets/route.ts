import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain, masterAset, users, notifications } from "@/db/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const whereClause =
    authUser.role === "teknisi"
      ? and(isNotNull(asetKomplain.ticketStatus), eq(asetKomplain.assignedUserId, authUser.id))
      : isNotNull(asetKomplain.ticketStatus);

  const rows = await db
    .select({
      id: asetKomplain.id,
      idAset: asetKomplain.idAset,
      nama: asetKomplain.nama,
      lokasiGedung: masterAset.lokasiGedung,
      lokasiLantai: masterAset.lokasiLantai,
      kategori: masterAset.kategori,
      tanggalPerencanaan: asetKomplain.tanggalPerencanaan,
      tanggalPengerjaan: asetKomplain.tanggalPengerjaan,
      tanggalSelesai: asetKomplain.tanggalSelesai,
      jenisKerusakan: asetKomplain.jenisKerusakan,
      severity: asetKomplain.severity,
      biayaPerbaikan: asetKomplain.biayaPerbaikan,
      teknisiPelaksana: asetKomplain.teknisiPelaksana,
      ticketStatus: asetKomplain.ticketStatus,
      assignedUserId: asetKomplain.assignedUserId,
      assignedUserName: users.name,
    })
    .from(asetKomplain)
    .leftJoin(masterAset, eq(asetKomplain.idAset, masterAset.idAset))
    .leftJoin(users, eq(asetKomplain.assignedUserId, users.id))
    .where(whereClause)
    .orderBy(desc(asetKomplain.id));

  // For teknisi: fire-and-forget overdue notification for any open/in_progress ticket past its planned date
  if (authUser.role === "teknisi") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTickets = rows.filter(r =>
      r.ticketStatus !== "completed" &&
      r.tanggalPerencanaan !== null &&
      new Date(r.tanggalPerencanaan) < today
    );

    if (overdueTickets.length > 0) {
      // Fetch all existing overdue notifications for this user, filter in JS
      const existingOverdue = await db
        .select({ relatedTicketId: notifications.relatedTicketId })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, authUser.id),
            eq(notifications.type, "ticket_overdue")
          )
        );
      const alreadyNotified = new Set(existingOverdue.map(n => n.relatedTicketId));

      const toInsert = overdueTickets.filter(t => !alreadyNotified.has(t.id));
      if (toInsert.length > 0) {
        await db.insert(notifications).values(
          toInsert.map(t => ({
            userId: authUser.id,
            type: "ticket_overdue",
            title: "Segera Lakukan Maintenance",
            message: `Aset ${t.nama ?? `#${t.idAset}`} melewati tanggal rencana maintenance${t.tanggalPerencanaan ? ` (${new Date(t.tanggalPerencanaan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })})` : ""}. Segera tindak lanjuti.`,
            relatedTicketId: t.id,
          }))
        );
      }
    }
  }

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { idAset, tanggalPerencanaan, assignedUserId } = body;

  if (!idAset || !assignedUserId) {
    return NextResponse.json({ message: "idAset and assignedUserId are required" }, { status: 400 });
  }

  const [master] = await db
    .select({ nama: masterAset.nama, status: masterAset.status })
    .from(masterAset)
    .where(eq(masterAset.idAset, Number(idAset)))
    .limit(1);

  if (!master) return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  if (master.status === "Under Maintenance") {
    return NextResponse.json({ message: "Asset is already under maintenance" }, { status: 409 });
  }

  const [assignee] = await db
    .select({ id: users.id, name: users.name, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, Number(assignedUserId)))
    .limit(1);

  if (!assignee || assignee.role !== "teknisi" || assignee.status !== "active") {
    return NextResponse.json({ message: "Invalid technician" }, { status: 400 });
  }

  const [inserted] = await db.insert(asetKomplain).values({
    idAset: Number(idAset),
    nama: master.nama ?? null,
    tanggalPerencanaan: tanggalPerencanaan || null,
    teknisiPelaksana: assignee.name,
    ticketStatus: "open",
    assignedUserId: assignee.id,
  }).$returningId();

  await db.update(masterAset).set({ status: "Under Maintenance" }).where(eq(masterAset.idAset, Number(idAset)));

  // Notify assigned technician
  await db.insert(notifications).values({
    userId: assignee.id,
    type: "ticket_assigned",
    title: "Tiket Maintenance Baru",
    message: `Anda ditugaskan untuk maintenance aset ${master.nama ?? `#${idAset}`}${tanggalPerencanaan ? `. Rencana: ${new Date(tanggalPerencanaan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}` : ""}.`,
    relatedTicketId: inserted.id,
  });

  // Notify all admins about the assignment
  const adminUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));

  if (adminUsers.length > 0) {
    await db.insert(notifications).values(
      adminUsers.map(a => ({
        userId: a.id,
        type: "ticket_created",
        title: "Tiket Dikirim ke Teknisi",
        message: `Tiket maintenance untuk aset ${master.nama ?? `#${idAset}`} telah dikirim ke ${assignee.name}.`,
        relatedTicketId: inserted.id,
      }))
    );
  }

  return NextResponse.json({ message: "Ticket created", ticketId: inserted.id }, { status: 201 });
}
