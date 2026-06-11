import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { asetKomplain, masterAset } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  const { tanggalPerencanaan, tanggalPengerjaan } = body;

  if (!tanggalPengerjaan) {
    return NextResponse.json({ message: "Execution date is required" }, { status: 400 });
  }

  try {
    const [master] = await db
      .select({ nama: masterAset.nama, status: masterAset.status })
      .from(masterAset)
      .where(eq(masterAset.idAset, id))
      .limit(1);

    if (!master) return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    if (master.status === "Under Maintenance") {
      return NextResponse.json({ message: "Asset is already under maintenance" }, { status: 409 });
    }

    await db.insert(asetKomplain).values({
      idAset: id,
      nama: master.nama ?? null,
      tanggalPerencanaan: tanggalPerencanaan || null,
      tanggalPengerjaan: tanggalPengerjaan,
    });

    await db
      .update(masterAset)
      .set({ status: "Under Maintenance" })
      .where(eq(masterAset.idAset, id));

    return NextResponse.json({ message: "Maintenance started" });
  } catch (err) {
    console.error("[POST /api/assets/[idAset]/start-maintenance]", err);
    return NextResponse.json({ message: "Failed to start maintenance" }, { status: 500 });
  }
}
