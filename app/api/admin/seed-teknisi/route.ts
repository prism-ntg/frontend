import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, asetKomplain } from "@/db/schema";
import { eq, isNotNull, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Get all distinct teknisi_pelaksana values
  const rows = await db
    .selectDistinct({ teknisi: asetKomplain.teknisiPelaksana })
    .from(asetKomplain)
    .where(isNotNull(asetKomplain.teknisiPelaksana));

  // Split comma-separated names and collect unique individual names
  const nameSet = new Set<string>();
  for (const row of rows) {
    if (!row.teknisi) continue;
    const parts = row.teknisi.split(",").map(s => s.trim()).filter(Boolean);
    for (const name of parts) {
      nameSet.add(name);
    }
  }

  const defaultPassword = await bcrypt.hash("teknisi123", 10);
  let created = 0;
  let skipped = 0;
  const results: { name: string; email: string; status: "created" | "skipped" }[] = [];

  for (const name of nameSet) {
    // Generate email from name: "Budi Santoso" → "budi.santoso@teknisi.prism"
    const email = name.toLowerCase()
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9.]/g, "") + "@teknisi.prism";

    // Check if already exists
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      skipped++;
      results.push({ name, email, status: "skipped" });
      continue;
    }

    await db.insert(users).values({
      name,
      email,
      password: defaultPassword,
      role: "teknisi",
      status: "active",
    });
    created++;
    results.push({ name, email, status: "created" });
  }

  return NextResponse.json({
    message: `Selesai: ${created} akun dibuat, ${skipped} sudah ada`,
    created,
    skipped,
    results,
  });
}
