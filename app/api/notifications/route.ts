import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, authUser.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const unreadCount = rows.filter(r => r.isRead === 0).length;
  return NextResponse.json({ data: rows, unreadCount });
}

export async function POST(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // Mark all as read
  await db
    .update(notifications)
    .set({ isRead: 1 })
    .where(and(eq(notifications.userId, authUser.id), eq(notifications.isRead, 0)));

  return NextResponse.json({ message: "All marked as read" });
}
