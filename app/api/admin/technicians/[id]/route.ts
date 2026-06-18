import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getCurrentUser(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  let newStatus: string;

  if (body.action) {
    if (!["approve", "reject"].includes(body.action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }
    newStatus = body.action === "approve" ? "active" : "rejected";
  } else if (body.status) {
    if (!["pending", "active", "rejected"].includes(body.status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }
    newStatus = body.status;
  } else {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const [target] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "teknisi")))
    .limit(1);

  if (!target) {
    return NextResponse.json({ message: "Technician not found" }, { status: 404 });
  }

  await db.update(users).set({ status: newStatus }).where(eq(users.id, userId));

  return NextResponse.json({ message: "Status updated successfully" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getCurrentUser(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
  }

  const [target] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "teknisi")))
    .limit(1);

  if (!target) {
    return NextResponse.json({ message: "Technician not found" }, { status: 404 });
  }

  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ message: "Technician deleted successfully" });
}
