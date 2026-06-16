import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status"); // 'pending' | 'active' | 'rejected' | null (all)

  const conditions = [eq(users.role, "teknisi")];
  if (statusFilter) conditions.push(eq(users.status, statusFilter));

  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, status: users.status, createdAt: users.createdAt })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.createdAt);

  return NextResponse.json({ data: rows });
}
