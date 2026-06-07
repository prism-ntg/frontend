import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterAset, asetKomplain, katalogHarga } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

const AI_URL = process.env.AI_API_URL ?? "http://localhost:8000";

const KEKRITISAN_SCORE: Record<string, number> = {
  Minor: 1,
  Major: 2,
  Critical: 3,
};

function diffHours(a: Date | null, b: Date | null): number {
  if (!a || !b) return 0;
  return Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);
}

function umurHari(tglInstalasi: Date | null | string): number {
  if (!tglInstalasi) return 0;
  const d = typeof tglInstalasi === "string" ? new Date(tglInstalasi) : tglInstalasi;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export async function POST() {
  try {
    // 1. Fetch all active assets
    const assets = await db
      .select()
      .from(masterAset)
      .where(eq(masterAset.status, "Aktif"));

    if (assets.length === 0) {
      return NextResponse.json({ message: "Tidak ada aset aktif." }, { status: 200 });
    }

    const assetIds = assets.map((a) => a.idAset);

    // 2. Fetch all complaints for these assets in one query
    const komplainRows = await db
      .select()
      .from(asetKomplain)
      .where(inArray(asetKomplain.idAset, assetIds));

    // 3. Fetch price catalog
    const tipeList = [...new Set(assets.map((a) => a.tipe).filter(Boolean))] as string[];
    const hargaRows = tipeList.length
      ? await db.select().from(katalogHarga).where(inArray(katalogHarga.tipe, tipeList))
      : [];
    const hargaMap = new Map(hargaRows.map((h) => [h.tipe, h.hargaBeli ?? 0]));

    // 4. Group complaints by asset id
    const komplainByAsset = new Map<number, typeof komplainRows>();
    for (const row of komplainRows) {
      const bucket = komplainByAsset.get(row.idAset) ?? [];
      bucket.push(row);
      komplainByAsset.set(row.idAset, bucket);
    }

    // 5. Build feature payload for each asset
    const payload = assets.map((asset) => {
      const logs = komplainByAsset.get(asset.idAset) ?? [];
      const avgBiayaPenggantian = hargaMap.get(asset.tipe ?? "") ?? 0;

      // Cold start: no complaints → inject 0 for all historical features
      if (logs.length === 0) {
        return {
          id_aset: String(asset.idAset),
          Kekritisan_Score: KEKRITISAN_SCORE[asset.kekritisan ?? ""] ?? 1,
          Avg_Maintenance_Delay: 0,
          Max_Maintenance_Delay: 0,
          Total_Downtime: 0,
          Avg_Downtime: 0,
          Total_Biaya_Perbaikan: 0,
          Failure_Frequency: 0,
          Peak_Severity: 0,
          Avg_Biaya_Penggantian: avgBiayaPenggantian,
          Cost_Risk_Ratio: 0,
          Umur_Aset_Hari: umurHari(asset.tglInstalasi as Date | null),
        };
      }

      const maintenanceDelays = logs.map((l) =>
        diffHours(
          l.tanggalPerencanaan as Date | null,
          l.tanggalPengerjaan as Date | null,
        ),
      );
      const downtimes = logs.map((l) =>
        diffHours(
          l.tanggalPengerjaan as Date | null,
          l.tanggalSelesai as Date | null,
        ),
      );
      const totalBiaya = logs.reduce((s, l) => s + (l.biayaPerbaikan ?? 0), 0);
      const totalDowntime = downtimes.reduce((s, v) => s + v, 0);
      const peakSeverity = Math.max(...logs.map((l) => l.severityScore ?? 0));

      return {
        id_aset: String(asset.idAset),
        Kekritisan_Score: KEKRITISAN_SCORE[asset.kekritisan ?? ""] ?? 1,
        Avg_Maintenance_Delay: maintenanceDelays.reduce((s, v) => s + v, 0) / maintenanceDelays.length,
        Max_Maintenance_Delay: Math.max(...maintenanceDelays),
        Total_Downtime: totalDowntime,
        Avg_Downtime: totalDowntime / downtimes.length,
        Total_Biaya_Perbaikan: totalBiaya,
        Failure_Frequency: logs.length,
        Peak_Severity: peakSeverity,
        Avg_Biaya_Penggantian: avgBiayaPenggantian,
        Cost_Risk_Ratio: avgBiayaPenggantian > 0 ? totalBiaya / avgBiayaPenggantian : 0,
        Umur_Aset_Hari: umurHari(asset.tglInstalasi as Date | null),
      };
    });

    // 6. Send to FastAPI
    const aiRes = await fetch(`${AI_URL}/predict/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      return NextResponse.json(
        { message: "FastAPI error", detail },
        { status: 502 },
      );
    }

    const aiJson = (await aiRes.json()) as {
      total: number;
      hasil: { id_aset: string; rekomendasi_jadwal: string; confidence?: number }[];
    };

    // 7. Bulk-update statusJadwal + confidence + lastPredictedAt in master_aset
    const now = new Date();
    await Promise.all(
      aiJson.hasil.map((item) =>
        db
          .update(masterAset)
          .set({
            statusJadwal: item.rekomendasi_jadwal,
            confidence: item.confidence ?? null,
            lastPredictedAt: now,
          })
          .where(eq(masterAset.idAset, Number(item.id_aset))),
      ),
    );

    return NextResponse.json({
      total_aset: assets.length,
      total_diproses: aiJson.total,
      hasil: aiJson.hasil,
    });
  } catch (err) {
    console.error("[/api/assets/predict] Error:", err);
    return NextResponse.json(
      { message: "Internal server error", detail: String(err) },
      { status: 500 },
    );
  }
}
