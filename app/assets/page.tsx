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

interface Filters {
  kategori: string[];
  tipe: string[];
  lokasi: string[];
  jadwal: string[];
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
  const [filters, setFilters] = useState<Filters>({ kategori: [], tipe: [], lokasi: [], jadwal: [] });
  const [selectedKategori, setSelectedKategori] = useState("");
  const [selectedTipe, setSelectedTipe] = useState("");
  const [selectedLokasi, setSelectedLokasi] = useState("");
  const [selectedJadwal, setSelectedJadwal] = useState("");
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [predMsg, setPredMsg] = useState<string | null>(null);
  const [lastPredictedAt, setLastPredictedAt] = useState<string | null>(null);

  const [modalAsset, setModalAsset] = useState<Asset | null>(null);
  const [komplainLogs, setKomplainLogs] = useState<KomplainLog[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const LIMIT = 50;

  // Load filters on mount
  useEffect(() => {
    fetch("/api/assets/filters")
      .then((r) => r.json())
      .then((data) => setFilters(data))
      .catch((err) => console.error("Failed to load filters:", err));
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        status: "Aktif",
        ...(selectedKategori && { kategori: selectedKategori }),
        ...(selectedTipe && { tipe: selectedTipe }),
        ...(selectedLokasi && { lokasi: selectedLokasi }),
        ...(selectedJadwal && { jadwal: selectedJadwal }),
      });
      const res = await fetch(`/api/assets?${params}`);
      const json = await res.json();
      setAssets(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, selectedKategori, selectedTipe, selectedLokasi, selectedJadwal]);

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
        setPredMsg(`❌ Prediksi gagal: ${json.message ?? "Server error"}`);
      } else {
        const now = new Date().toLocaleString("id-ID");
        setLastPredictedAt(now);
        setPredMsg(`✅ Prediksi berhasil — ${json.total_diproses ?? 0} aset diperbarui pada ${now}`);
        fetchAssets();
      }
    } catch (err) {
      setPredMsg(`❌ Prediksi gagal: ${String(err)}`);
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

  const handleFilterChange = (type: "kategori" | "tipe" | "lokasi" | "jadwal", value: string) => {
    if (type === "kategori") setSelectedKategori(value);
    else if (type === "tipe") setSelectedTipe(value);
    else if (type === "lokasi") setSelectedLokasi(value);
    else if (type === "jadwal") setSelectedJadwal(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Manajemen Aset</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {total.toLocaleString()} aset ditemukan
            </p>
          </div>
          <button
            onClick={runPrediction}
            disabled={predicting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 w-fit"
          >
            {predicting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Prediksi berjalan...
              </>
            ) : (
              "🚀 Jalankan Prediksi"
            )}
          </button>
        </div>
        {lastPredictedAt && (
          <p className="text-xs text-zinc-400 mt-2">
            Prediksi terakhir: {lastPredictedAt}
          </p>
        )}
      </div>

      {/* Status Message */}
      {predMsg && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm animate-in fade-in ${
            predMsg.includes("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {predMsg}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select
          value={selectedKategori}
          onChange={(e) => handleFilterChange("kategori", e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm"
        >
          <option value="">Semua Kategori</option>
          {filters.kategori.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <select
          value={selectedTipe}
          onChange={(e) => handleFilterChange("tipe", e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm"
        >
          <option value="">Semua Tipe</option>
          {filters.tipe.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={selectedLokasi}
          onChange={(e) => handleFilterChange("lokasi", e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm"
        >
          <option value="">Semua Lokasi</option>
          {filters.lokasi.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={selectedJadwal}
          onChange={(e) => handleFilterChange("jadwal", e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm"
        >
          <option value="">Semua Jadwal Prediksi</option>
          {filters.jadwal.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">ID Aset</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Tanggal Instalasi</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Kekritisan</th>
                <th className="px-4 py-3">Jadwal AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    Memuat data dari database...
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
                      {a.tglInstalasi
                        ? new Date(a.tglInstalasi).toLocaleDateString("id-ID")
                        : "—"}
                    </td>
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
                      {a.statusJadwal ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${JADWAL_COLORS[a.statusJadwal] ?? "bg-indigo-100 text-indigo-700"}`}
                        >
                          {a.statusJadwal}
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
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
