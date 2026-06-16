import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const notifId = parseInt(id, 10);
  if (isNaN(notifId)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

  await db
    .update(notifications)
    .set({ isRead: 1 })
    .where(and(eq(notifications.id, notifId), eq(notifications.userId, authUser.id)));

  return NextResponse.json({ message: "Marked as read" });
}
