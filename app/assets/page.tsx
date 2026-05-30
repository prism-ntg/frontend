"use client";

import { useEffect, useState, useCallback } from "react";

interface Asset {
  id: number;
  idAset: string;
  nama: string | null;
  merek: string | null;
  kategori: string | null;
  subKategori: string | null;
  tipe: string | null;
  tglInstalasi: string | null;
  lokasiGedung: string | null;
  lokasiLantai: string | null;
  lokasiZona: string | null;
  kekritisan: string | null;
  status: string;
  statusJadwal: string | null;
}

interface KomplainLog {
  id: number;
  tanggalPengerjaan: string | null;
  jenisKerusakan: string | null;
  severity: string | null;
  severityScore: number | null;
  penyebab: string | null;
  biayaPerbaikan: number | null;
  sparePartDigunakan: string | null;
  teknisiPelaksana: string | null;
}

const JADWAL_COLORS: Record<string, string> = {
  Harian: "bg-red-100 text-red-700",
  Mingguan: "bg-orange-100 text-orange-700",
  Bulanan: "bg-yellow-100 text-yellow-700",
  Tahunan: "bg-green-100 text-green-700",
};

const KEKRITISAN_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  Major: "bg-orange-100 text-orange-700",
  Minor: "bg-blue-100 text-blue-700",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("Aktif");
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [predMsg, setPredMsg] = useState<string | null>(null);

  const [modalAsset, setModalAsset] = useState<Asset | null>(null);
  const [komplainLogs, setKomplainLogs] = useState<KomplainLog[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const LIMIT = 50;

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/assets?page=${page}&limit=${LIMIT}&status=${statusFilter}`,
      );
      const json = await res.json();
      setAssets(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  async function runPrediction() {
    setPredicting(true);
    setPredMsg(null);
    try {
      const res = await fetch("/api/assets/predict", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setPredMsg(`Error: ${json.message ?? "Gagal menghubungi AI server"}`);
      } else {
        setPredMsg(
          `Prediksi selesai — ${json.total_diproses} aset diperbarui.`,
        );
        fetchAssets();
      }
    } catch {
      setPredMsg("Gagal: tidak dapat terhubung ke server.");
    } finally {
      setPredicting(false);
    }
  }

  async function openModal(asset: Asset) {
    setModalAsset(asset);
    setKomplainLogs([]);
    setModalLoading(true);
    try {
      const res = await fetch(
        `/api/assets/${encodeURIComponent(asset.idAset)}/komplain`,
      );
      const json = await res.json();
      setKomplainLogs(json.data ?? []);
    } finally {
      setModalLoading(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Manajemen Aset</h1>
          <p className="text-sm text-zinc-500">
            {total.toLocaleString()} aset ditemukan
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm"
          >
            <option value="Aktif">Aktif</option>
            <option value="Non-Aktif">Non-Aktif</option>
            <option value="">Semua</option>
          </select>

          <button
            onClick={runPrediction}
            disabled={predicting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {predicting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Memproses...
              </>
            ) : (
              "Jalankan Prediksi AI"
            )}
          </button>
        </div>
      </div>

      {predMsg && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${predMsg.startsWith("Error") || predMsg.startsWith("Gagal") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
        >
          {predMsg}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">ID Aset</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Kekritisan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Jadwal AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    Memuat data...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => openModal(a)}
                    className="cursor-pointer transition-colors hover:bg-indigo-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                      {a.idAset}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{a.tipe ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {a.kategori ?? "—"}
                      {a.subKategori ? ` / ${a.subKategori}` : ""}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {[a.lokasiGedung, a.lokasiLantai, a.lokasiZona]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.kekritisan ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${KEKRITISAN_COLORS[a.kekritisan] ?? "bg-zinc-100 text-zinc-600"}`}
                        >
                          {a.kekritisan}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "Aktif" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.statusJadwal ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${JADWAL_COLORS[a.statusJadwal] ?? "bg-indigo-100 text-indigo-700"}`}
                        >
                          {a.statusJadwal}
                        </span>
                      ) : (
                        <span className="text-zinc-300">Belum dianalisis</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm text-zinc-500">
            <span>
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-zinc-200 px-3 py-1 hover:bg-zinc-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-zinc-200 px-3 py-1 hover:bg-zinc-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Complaint Log Modal */}
      {modalAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalAsset(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Log Komplain — {modalAsset.idAset}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {modalAsset.tipe} &middot; {modalAsset.kekritisan} &middot;{" "}
                  {modalAsset.lokasiGedung}
                  {modalAsset.statusJadwal && (
                    <>
                      {" "}
                      &middot;{" "}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${JADWAL_COLORS[modalAsset.statusJadwal] ?? "bg-indigo-100 text-indigo-700"}`}
                      >
                        Jadwal AI: {modalAsset.statusJadwal}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setModalAsset(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {modalLoading ? (
                <div className="py-12 text-center text-zinc-400">
                  Memuat log...
                </div>
              ) : komplainLogs.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  Belum ada log komplain untuk aset ini.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left text-zinc-500">
                      <th className="pb-2 pr-4">Tanggal</th>
                      <th className="pb-2 pr-4">Jenis Kerusakan</th>
                      <th className="pb-2 pr-4">Severity</th>
                      <th className="pb-2 pr-4">Biaya</th>
                      <th className="pb-2">Penyebab</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {komplainLogs.map((log) => (
                      <tr key={log.id} className="text-zinc-600">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {log.tanggalPengerjaan
                            ? new Date(log.tanggalPengerjaan).toLocaleDateString("id-ID")
                            : "—"}
                        </td>
                        <td className="py-2 pr-4">{log.jenisKerusakan ?? "—"}</td>
                        <td className="py-2 pr-4">
                          {log.severity ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">
                              {log.severity}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {log.biayaPerbaikan != null
                            ? `Rp ${log.biayaPerbaikan.toLocaleString("id-ID")}`
                            : "—"}
                        </td>
                        <td className="py-2 text-zinc-400 max-w-xs truncate">
                          {log.penyebab ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border-t border-zinc-100 px-6 py-3 text-xs text-zinc-400">
              {komplainLogs.length} entri log ditemukan
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
