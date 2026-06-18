"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, ChevronDown, ArrowLeftRight, X, CalendarDays } from "lucide-react";

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
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000;
}

// Skeleton row

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[80, 120, 80, 80, 120, 100].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-zinc-100" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// Date range filter (same pattern as dashboard DateRangeFilter)

function DateRangeFilter({
  dateFrom, dateTo, onChange,
}: {
  dateFrom: string; dateTo: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalFrom(dateFrom); setLocalTo(dateTo); }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function apply() { onChange(localFrom, localTo); setOpen(false); }
  function clear()  { setLocalFrom(""); setLocalTo(""); onChange("", ""); setOpen(false); }

  const label = dateFrom && dateTo
    ? `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`
    : dateFrom ? `From ${fmtDate(dateFrom)}`
    : dateTo   ? `Until ${fmtDate(dateTo)}`
    : "All dates";

  const active = !!(dateFrom || dateTo);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm transition-all duration-150 cursor-pointer ${
          active
            ? "border-indigo-200 bg-indigo-50/50 text-indigo-600"
            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-indigo-300 hover:text-indigo-600"
        }`}
      >
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-zinc-100 shadow-2xl p-5 w-64"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "scale(1)" : "scale(0.96)",
          pointerEvents: open ? "auto" : "none",
          transformOrigin: "top right",
          transition: "opacity 150ms cubic-bezier(0.23,1,0.32,1), transform 150ms cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        <div className="mb-4">
          <p className="text-sm font-semibold text-zinc-800">Select Date Range</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Filter by replacement date</p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1.5">Start Date</p>
            <input
              type="date"
              value={localFrom}
              max={localTo || undefined}
              onChange={e => setLocalFrom(e.target.value)}
              className="w-full text-xs border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-700 bg-zinc-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent cursor-pointer font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-100" />
            <span className="text-[10px] text-zinc-400">to</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1.5">End Date</p>
            <input
              type="date"
              value={localTo}
              min={localFrom || undefined}
              onChange={e => setLocalTo(e.target.value)}
              className="w-full text-xs border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-700 bg-zinc-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent cursor-pointer font-medium"
            />
          </div>
        </div>

        <button
          onClick={apply}
          className="mt-4 w-full rounded-xl bg-indigo-600 text-white text-xs font-semibold py-2.5 hover:bg-indigo-700 active:scale-[0.97] transition duration-150 cursor-pointer"
        >
          Apply
        </button>

        {(localFrom || localTo) && (
          <button
            onClick={clear}
            className="mt-2 w-full rounded-xl border border-zinc-200 text-zinc-500 text-xs font-medium py-2 hover:bg-zinc-50 active:scale-[0.97] transition duration-150 cursor-pointer"
          >
            Clear dates
          </button>
        )}
      </div>
    </div>
  );
}

// Page

const LIMIT = 20;

export default function ReplacementLogPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ReplacementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = useCallback((p: number, q: string, from: string, to: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (q)    params.set("search", q);
    if (from) params.set("dateFrom", from);
    if (to)   params.set("dateTo", to);
    fetch(`/api/logs/replacement?${params}`)
      .then(r => r.json())
      .then(d => { setRows(d.data ?? []); setTotal(d.total ?? 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(page, search, dateFrom, dateTo); }, [fetchData, page, search, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const hasFilter = searchInput || dateFrom || dateTo;

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  const pageNums: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else {
    pageNums.push(1, 2);
    if (page > 4) pageNums.push("…");
    for (let i = Math.max(3, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pageNums.push(i);
    if (page < totalPages - 3) pageNums.push("…");
    pageNums.push(totalPages - 1, totalPages);
  }

  return (
    <div className="-m-4 md:-m-8 flex flex-col overflow-hidden" style={{ height: "calc(100svh - 5rem - 2rem)" }}>
    <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
          <h1 className="text-xl font-bold text-zinc-800">Replacement Log</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-0.5 ml-7">
          History of all asset replacements
        </p>
      </div>

      {/* Table card */}
      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm flex flex-col">

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 px-4 pt-4 pb-3 border-b border-zinc-100 shrink-0">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search asset name…"
              className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-700 shadow-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-[border-color,box-shadow]"
            />
          </div>

          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
          />

          {hasFilter && (
            <button
              onClick={() => { setSearchInput(""); setSearch(""); setDateFrom(""); setDateTo(""); setPage(1); }}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 active:scale-95 transition-[background-color,border-color,color,transform] duration-150"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 whitespace-nowrap">Replacement Date</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Old Asset</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Category / Type</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">New Asset</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Reason</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 whitespace-nowrap">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : rows.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-sm text-zinc-400">
                        {search ? `No records found for "${search}"` : "No replacement records yet"}
                      </td>
                    </tr>
                  )
                  : rows.map((row) => {
                    const recent = isRecent(row.tanggalPenggantian);
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-zinc-50/80 transition-colors ${recent ? "bg-indigo-50/30" : ""}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-600">{fmtDate(row.tanggalPenggantian)}</span>
                            {recent && (
                              <span className="rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-semibold px-1.5 py-0.5 border border-indigo-200">
                                New
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/assets?tab=inactive&search=${encodeURIComponent(row.namaAsetLama ?? String(row.idAsetLama))}`)}
                            className="text-left group/btn"
                          >
                            <p className="text-xs font-semibold text-zinc-700 group-hover/btn:text-indigo-600 transition-colors">
                              {row.namaAsetLama ?? `#${row.idAsetLama}`}
                            </p>
                            <p className="text-[10px] text-zinc-400">ID {row.idAsetLama}</p>
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-xs text-zinc-600">{row.kategori ?? "—"}</p>
                          <p className="text-[10px] text-zinc-400">{row.tipe ?? "—"}</p>
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
                              <p className="text-[10px] text-zinc-400">ID {row.idAsetBaru}</p>
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs text-zinc-500 truncate" title={row.alasanPenggantian ?? undefined}>
                            {row.alasanPenggantian ?? "—"}
                          </p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-medium tabular-nums ${row.biayaPenggantian ? "text-zinc-700" : "text-zinc-400"}`}>
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

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 bg-white shrink-0">
          <span className="text-xs text-zinc-500">
            {total === 0 ? "No records" : `Showing ${showingFrom.toLocaleString()} to ${showingTo.toLocaleString()} of ${total.toLocaleString()} records`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="flex items-center justify-center w-9 h-9 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-500" />
              </button>
              {pageNums.map((n, i) => n === "…"
                ? <span key={`e${i}`} className="px-1 text-xs text-zinc-500">…</span>
                : <button
                    key={n}
                    onClick={() => setPage(n as number)}
                    aria-current={page === n ? "page" : undefined}
                    className={`w-9 h-9 rounded text-xs font-medium transition-[background-color,color] duration-150 ${page === n ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-100"}`}
                  >
                    {n}
                  </button>
              )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="flex items-center justify-center w-9 h-9 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
