"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Wrench, X } from "lucide-react";

// Types

interface MaintenanceRow {
  id: number;
  idAset: number;
  nama: string | null;
  lokasiGedung: string | null;
  tanggalPerencanaan: string | null;
  tanggalPengerjaan: string | null;
  tanggalSelesai: string | null;
  jenisKerusakan: string | null;
  penyebab: string | null;
  severity: string | null;
  severityScore: number | null;
  biayaPerbaikan: number | null;
  sparePartDigunakan: string | null;
  teknisiPelaksana: string | null;
}

// Helpers

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRupiah(n: number | null): string {
  if (n == null) return "—";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function isRecent(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000;
}

// Severity badge

const SEV_BADGE: Record<string, string> = {
  Fatal:  "bg-red-100 text-red-700 border-red-200",
  Berat:  "bg-orange-100 text-orange-700 border-orange-200",
  Sedang: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Ringan: "bg-green-100 text-green-700 border-green-200",
};

function SeverityBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  const cls = SEV_BADGE[value] ?? "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium border whitespace-nowrap ${cls}`}>
      {value}
    </span>
  );
}

// Status badge

function StatusBadge({ selesai }: { selesai: string | null }) {
  return selesai ? (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium border bg-emerald-100 text-emerald-700 border-emerald-200 whitespace-nowrap">
      Selesai
    </span>
  ) : (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium border bg-amber-100 text-amber-700 border-amber-200 whitespace-nowrap">
      On-Going
    </span>
  );
}

// Skeleton row

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      {[40, 90, 130, 100, 120, 80, 80, 90, 80].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-slate-100" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// Pagination

function Pagination({
  page, total, limit, onPage,
}: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        {total === 0 ? "No records" : `${from}–${to} of ${total.toLocaleString()} records`}
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <span className="text-xs text-slate-500 px-2 tabular-nums">{page} / {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
}

// Page

const SEVERITIES = ["Fatal", "Berat", "Sedang", "Ringan"];
const LIMIT = 20;

export default function MaintenanceLogPage() {
  const router = useRouter();

  const [rows, setRows]             = useState<MaintenanceRow[]>([]);
  const [total, setTotal]           = useState(0);
  const [gedungList, setGedungList] = useState<string[]>([]);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [severity, setSeverity]       = useState("");
  const [gedung, setGedung]           = useState("");

  const fetchData = useCallback((p: number, q: string, sev: string, g: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (q)   params.set("search", q);
    if (sev) params.set("severity", sev);
    if (g)   params.set("gedung", g);
    fetch(`/api/logs/maintenance?${params}`)
      .then(r => r.json())
      .then(d => {
        setRows(d.data ?? []);
        setTotal(d.total ?? 0);
        if (d.gedungList) setGedungList(d.gedungList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(page, search, severity, gedung); }, [fetchData, page, search, severity, gedung]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handlePage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    setSearchInput(""); setSearch("");
    setSeverity(""); setGedung("");
    setPage(1);
  }

  const hasFilter = search || severity || gedung;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-800">Maintenance Log</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 ml-7">
            All asset repair and maintenance records
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search asset name…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 w-44"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Severity filter */}
          <select
            value={severity}
            onChange={e => { setSeverity(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 cursor-pointer"
          >
            <option value="">All Severity</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Gedung filter */}
          <select
            value={gedung}
            onChange={e => { setGedung(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 cursor-pointer max-w-[160px]"
          >
            <option value="">All Buildings</option>
            {gedungList.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          {hasFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-10">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Tgl Pengerjaan</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Aset</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Gedung</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Jenis Kerusakan</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Severity</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Biaya</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Teknisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : rows.length === 0
                  ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-sm text-slate-400">
                        {hasFilter ? "No records match your filters" : "No maintenance records yet"}
                      </td>
                    </tr>
                  )
                  : rows.map((row, idx) => {
                    const recent = isRecent(row.tanggalPengerjaan);
                    const rowNum = (page - 1) * LIMIT + idx + 1;
                    return (
                      <tr
                        key={row.id}
                        className={`group hover:bg-slate-50/80 transition-colors ${recent ? "bg-indigo-50/30" : ""}`}
                      >
                        <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{rowNum}</td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-600">{fmtDate(row.tanggalPengerjaan)}</span>
                              {recent && (
                                <span className="rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-semibold px-1.5 py-0.5 border border-indigo-200">
                                  Baru
                                </span>
                              )}
                            </div>
                            {row.tanggalSelesai && (
                              <span className="text-[10px] text-slate-400">
                                Selesai {fmtDate(row.tanggalSelesai)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/assets?search=${encodeURIComponent(row.nama ?? String(row.idAset))}`)}
                            className="text-left group/btn"
                          >
                            <p className="text-xs font-semibold text-slate-700 group-hover/btn:text-indigo-600 transition-colors truncate max-w-[140px]">
                              {row.nama ?? `#${row.idAset}`}
                            </p>
                            <p className="text-[10px] text-slate-400">ID {row.idAset}</p>
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {row.lokasiGedung ?? "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3 max-w-[160px]">
                          <p className="text-xs text-slate-600 truncate" title={row.jenisKerusakan ?? undefined}>
                            {row.jenisKerusakan ?? "—"}
                          </p>
                          {row.penyebab && (
                            <p className="text-[10px] text-slate-400 truncate" title={row.penyebab}>
                              {row.penyebab}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <SeverityBadge value={row.severity} />
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-medium tabular-nums ${row.biayaPerbaikan ? "text-slate-700" : "text-slate-400"}`}>
                            {fmtRupiah(row.biayaPerbaikan)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge selesai={row.tanggalSelesai} />
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {row.teknisiPelaksana ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={total} limit={LIMIT} onPage={handlePage} />
      </div>
    </div>
  );
}
