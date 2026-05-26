import { NextRequest, NextResponse } from "next/server";

const INFERENCE_URL =
  process.env.INFERENCE_SERVER_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawWorkOrder {
  ID_Aset: string;
  Kategori: string;
  Sub_Kategori: string;
  Tipe: string;
  Tanggal_Instalasi: string;
  Tingkat_Kekritisan: "Minor" | "Major" | "Critical";
  Biaya_Penggantian: number;
  Biaya_Perbaikan: number;
  Jenis_Kerusakan: string;
  Severity: number;
  Tanggal_Perencanaan: string;
  Tanggal_Pengerjaan: string;
  Tanggal_Selesai: string;
}

interface AssetFeatures {
  Kekritisan_Score: number;
  Failure_Frequency: number;
  Total_Biaya_Perbaikan: number;
  Avg_Biaya_Penggantian: number;
  Cost_Risk_Ratio: number;
  Umur_Aset_Hari: number;
  Avg_Maintenance_Delay: number;
  Max_Maintenance_Delay: number;
  Total_Downtime: number;
  Avg_Downtime: number;
  Peak_Severity: number;
}

interface AssetResult extends AssetFeatures {
  ID_Aset: string;
  Kategori: string;
  Sub_Kategori: string;
  Tipe: string;
  Rekomendasi_Jadwal: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KEKRITISAN_MAP: Record<string, number> = {
  Minor: 1,
  Major: 2,
  Critical: 3,
};

function diffHours(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms / (1000 * 60 * 60);
}

function diffDays(instalasi: string): number {
  const ms = Date.now() - new Date(instalasi).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function computeFeatures(
  rows: RawWorkOrder[]
): Map<string, { features: AssetFeatures; meta: Pick<RawWorkOrder, "Kategori" | "Sub_Kategori" | "Tipe"> }> {
  const grouped = new Map<string, RawWorkOrder[]>();

  for (const row of rows) {
    const bucket = grouped.get(row.ID_Aset) ?? [];
    bucket.push(row);
    grouped.set(row.ID_Aset, bucket);
  }

  const result = new Map<
    string,
    { features: AssetFeatures; meta: Pick<RawWorkOrder, "Kategori" | "Sub_Kategori" | "Tipe"> }
  >();

  for (const [id, group] of grouped) {
    const first = group[0];

    const maintenanceDelays = group.map((r) =>
      diffHours(r.Tanggal_Perencanaan, r.Tanggal_Pengerjaan)
    );
    const downtimes = group.map((r) =>
      diffHours(r.Tanggal_Pengerjaan, r.Tanggal_Selesai)
    );

    const Total_Biaya_Perbaikan = group.reduce(
      (sum, r) => sum + r.Biaya_Perbaikan,
      0
    );
    const Avg_Biaya_Penggantian = first.Biaya_Penggantian;
    const Total_Downtime = downtimes.reduce((s, v) => s + v, 0);

    const features: AssetFeatures = {
      Kekritisan_Score: Math.max(
        ...group.map((r) => KEKRITISAN_MAP[r.Tingkat_Kekritisan] ?? 1)
      ),
      Failure_Frequency: group.length,
      Total_Biaya_Perbaikan,
      Avg_Biaya_Penggantian,
      Cost_Risk_Ratio:
        Avg_Biaya_Penggantian > 0
          ? Total_Biaya_Perbaikan / Avg_Biaya_Penggantian
          : 0,
      Umur_Aset_Hari: diffDays(first.Tanggal_Instalasi),
      Avg_Maintenance_Delay:
        maintenanceDelays.reduce((s, v) => s + v, 0) / maintenanceDelays.length,
      Max_Maintenance_Delay: Math.max(...maintenanceDelays),
      Total_Downtime,
      Avg_Downtime: Total_Downtime / downtimes.length,
      Peak_Severity: Math.max(...group.map((r) => r.Severity)),
    };

    result.set(id, {
      features,
      meta: {
        Kategori: first.Kategori,
        Sub_Kategori: first.Sub_Kategori,
        Tipe: first.Tipe,
      },
    });
  }

  return result;
}

async function predictAsset(features: AssetFeatures): Promise<string> {
  const res = await fetch(`${INFERENCE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(features),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`FastAPI error ${res.status}: ${detail}`);
  }

  const json = (await res.json()) as { status: string; rekomendasi_jadwal: string };
  return json.rekomendasi_jadwal;
}

// ---------------------------------------------------------------------------
// POST /api/assets/analyze
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { message: "Request body harus berupa array of work orders yang tidak kosong." },
        { status: 400 }
      );
    }

    const rawData = body as RawWorkOrder[];
    const assetMap = computeFeatures(rawData);

    const predictions = await Promise.allSettled(
      Array.from(assetMap.entries()).map(async ([id, { features, meta }]) => {
        const rekomendasi = await predictAsset(features);
        const result: AssetResult = {
          ID_Aset: id,
          ...meta,
          ...features,
          Rekomendasi_Jadwal: rekomendasi,
        };
        return result;
      })
    );

    const hasil: AssetResult[] = [];
    const errors: { ID_Aset: string; error: string }[] = [];

    let i = 0;
    for (const [id] of assetMap.entries()) {
      const settled = predictions[i++];
      if (settled.status === "fulfilled") {
        hasil.push(settled.value);
      } else {
        errors.push({ ID_Aset: id, error: String(settled.reason) });
      }
    }

    return NextResponse.json(
      {
        total_aset: assetMap.size,
        total_berhasil: hasil.length,
        total_gagal: errors.length,
        hasil,
        ...(errors.length > 0 && { errors }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[/api/assets/analyze] Error:", error);
    return NextResponse.json(
      { message: "Internal server error", detail: String(error) },
      { status: 500 }
    );
  }
}
