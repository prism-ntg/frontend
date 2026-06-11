"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, ArrowLeftRight } from "lucide-react";

// Types

interface ReplacementRow {
  id: number;
  idAsetLama: number;
  namaAsetLama: string | null;
  kategori: string | null;
  tipe: string | null;
  idAsetBaru: number | null;
  namaAsetBaru: string | null;
  tanggalPenggantian: string | null;
  alasanPenggantian: string | null;
  biayaPenggantian: number | null;
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
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000; // within 7 days
}

// Skeleton row

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      {[40, 80, 120, 80, 80, 120, 100, 100].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3 rounded bg-slate-100`} style={{ width: w }} />
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

export default function ReplacementLogPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ReplacementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const LIMIT = 20;

  const fetchData = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (q) params.set("search", q);
    fetch(`/api/logs/replacement?${params}`)
      .then(r => r.json())
      .then(d => { setRows(d.data ?? []); setTotal(d.total ?? 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(page, search); }, [fetchData, page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handlePage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-800">Replacement Log</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 ml-7">
            History of all asset replacements
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search asset name…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 w-52"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-10">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Tgl Penggantian</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Aset Lama</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kategori / Tipe</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Aset Baru</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Alasan</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : rows.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                        {search ? `No records found for "${search}"` : "No replacement records yet"}
                      </td>
                    </tr>
                  )
                  : rows.map((row, idx) => {
                    const recent = isRecent(row.tanggalPenggantian);
                    const rowNum = (page - 1) * LIMIT + idx + 1;
                    return (
                      <tr
                        key={row.id}
                        className={`group hover:bg-slate-50/80 transition-colors ${recent ? "bg-indigo-50/30" : ""}`}
                      >
                        <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{rowNum}</td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">{fmtDate(row.tanggalPenggantian)}</span>
                            {recent && (
                              <span className="rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-semibold px-1.5 py-0.5 border border-indigo-200">
                                Baru
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/assets?search=${encodeURIComponent(row.namaAsetLama ?? String(row.idAsetLama))}`)}
                            className="text-left group/btn"
                          >
                            <p className="text-xs font-semibold text-slate-700 group-hover/btn:text-indigo-600 transition-colors">
                              {row.namaAsetLama ?? `#${row.idAsetLama}`}
                            </p>
                            <p className="text-[10px] text-slate-400">ID {row.idAsetLama}</p>
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-600">{row.kategori ?? "—"}</p>
                          <p className="text-[10px] text-slate-400">{row.tipe ?? "—"}</p>
                        </td>

                        <td className="px-4 py-3">
                          {row.idAsetBaru ? (
                            <button
                              onClick={() => router.push(`/assets?search=${encodeURIComponent(row.namaAsetBaru ?? String(row.idAsetBaru))}`)}
                              className="text-left group/btn"
                            >
                              <p className="text-xs font-semibold text-emerald-700 group-hover/btn:text-emerald-600 transition-colors">
                                {row.namaAsetBaru ?? `#${row.idAsetBaru}`}
                              </p>
                              <p className="text-[10px] text-slate-400">ID {row.idAsetBaru}</p>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs text-slate-500 truncate" title={row.alasanPenggantian ?? undefined}>
                            {row.alasanPenggantian ?? "—"}
                          </p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-medium tabular-nums ${row.biayaPenggantian ? "text-slate-700" : "text-slate-400"}`}>
                            {fmtRupiah(row.biayaPenggantian)}
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
