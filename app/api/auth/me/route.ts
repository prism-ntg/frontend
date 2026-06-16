import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getCurrentUser(request);
  if (!authUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
      columns: { name: true, email: true, role: true, status: true },
    });

    return NextResponse.json({
      user: {
        id: authUser.id,
        email: authUser.email,
        name: userRecord?.name,
        role: userRecord?.role ?? authUser.role,
      },
    });
  } catch {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
