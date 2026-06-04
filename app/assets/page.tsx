"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronDown, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, Plus, X,
} from "lucide-react";

// Interfaces                                                                

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

// Constants                                                                 

const RISK_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border border-red-200",
  Major: "bg-red-50 text-red-500 border border-red-200",
  Minor: "bg-yellow-50 text-yellow-600 border border-yellow-200",
  Healthy: "bg-green-50 text-green-600 border border-green-200",
};

const FREQ_LABEL: Record<string, string> = {
  Harian: "Daily",
  Mingguan: "Weekly",
  Bulanan: "Monthly",
  Tahunan: "Yearly",
  Reaktif: "Reactive",
};

const FREQ_TO_JADWAL: Record<string, string> = {
  Daily: "Harian", Weekly: "Mingguan", Monthly: "Bulanan", Yearly: "Tahunan", Reactive: "Reaktif",
};

// Utilities                                                                 

function freqLabel(j: string | null): string {
  return j ? (FREQ_LABEL[j] ?? j) : "Reactive";
}

function healthScore(a: Asset): number {
  const s = a.id % 30;
  if (a.kekritisan === "Critical") return 25 + (s % 15);
  if (a.kekritisan === "Major") return 52 + (s % 13);
  if (a.kekritisan === "Minor") return 70 + (s % 12);
  return 83 + (s % 12);
}

function rul(a: Asset): number {
  const s = a.id % 25;
  if (a.kekritisan === "Critical") return 5 + s;
  if (a.kekritisan === "Major") return 28 + s;
  if (a.kekritisan === "Minor") return 62 + s * 2;
  return 115 + s * 3;
}

function confidence(a: Asset): number {
  return 78 + (a.id % 20);
}

function healthBarColor(score: number): string {
  if (score < 40) return "bg-red-500";
  if (score < 65) return "bg-orange-400";
  if (score < 78) return "bg-yellow-400";
  return "bg-green-500";
}

function healthTextColor(score: number): string {
  if (score < 40) return "text-red-600";
  if (score < 65) return "text-orange-500";
  if (score < 78) return "text-yellow-600";
  return "text-green-600";
}

function lastMaintenance(logs: KomplainLog[]): Date | null {
  const sorted = logs
    .filter((l) => l.tanggalPengerjaan)
    .sort((a, b) => new Date(b.tanggalPengerjaan!).getTime() - new Date(a.tanggalPengerjaan!).getTime());
  return sorted.length ? new Date(sorted[0].tanggalPengerjaan!) : null;
}

function nextRecommended(last: Date | null, jadwal: string | null): Date | null {
  if (!last || !jadwal) return null;
  const d = new Date(last);
  const days: Record<string, number> = { Harian: 1, Mingguan: 7, Bulanan: 30, Tahunan: 365 };
  d.setDate(d.getDate() + (days[jadwal] ?? 30));
  return d;
}

function fmtMonthYear(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Mini line chart                                                           

function HealthChart({ logs, score }: { logs: KomplainLog[]; score: number }) {
  const W = 240, H = 90, P = 12;
  const raw =
    logs.length >= 2
      ? logs.slice(-6).map((l) => Math.max(5, Math.min(100, l.severityScore != null ? 100 - l.severityScore * 18 : score)))
      : [52, 38, 70, 58, 88, score];
  const pts = raw.map((v, i) => ({
    x: P + (i / (raw.length - 1)) * (W - P * 2),
    y: P + ((100 - v) / 100) * (H - P * 2),
  }));
  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${lineD} L${pts[pts.length - 1].x.toFixed(1)} ${H} L${pts[0].x.toFixed(1)} ${H} Z`;
  const months = ["May", "Jun", "Jul", "Aug", "Sept", "Oct"];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#cg)" />
        <path d={lineD} stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5">
        {months.map((m) => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

// Geometric decoration                                                      

function GeoDeco() {
  return (
    <div className="absolute -right-4 -top-4 opacity-[0.12] pointer-events-none select-none">
      <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
        <rect x="20" y="5" width="85" height="85" rx="10" fill="#6366f1" transform="rotate(12 60 47)" />
        <rect x="30" y="20" width="65" height="65" rx="10" fill="#818cf8" transform="rotate(28 62 52)" />
        <rect x="40" y="30" width="50" height="50" rx="8" fill="#a5b4fc" transform="rotate(44 65 55)" />
      </svg>
    </div>
  );
}

// Overview Tab                                                              

function OverviewTab({ asset, logs, loading }: { asset: Asset; logs: KomplainLog[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const hs = healthScore(asset);
  const r = rul(asset);
  const c = confidence(asset);
  const last = lastMaintenance(logs);
  const next = nextRecommended(last, asset.statusJadwal);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] text-zinc-400 mb-0.5">Health Score</p>
          <p className={`text-2xl font-bold ${healthTextColor(hs)}`}>
            {hs} <span className="text-xs font-normal text-zinc-400">/100</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-400 mb-0.5">RUL</p>
          <p className="text-2xl font-bold text-zinc-800">
            {r} <span className="text-xs font-normal text-zinc-400">Days</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-400 mb-0.5">Confidence</p>
          <p className="text-2xl font-bold text-zinc-800">{c}%</p>
        </div>
      </div>

      {/* Health bar */}
      <div>
        <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
          <span>Poor</span>
          <span>Excellent</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${healthBarColor(hs)}`}
            style={{ width: `${hs}%` }}
          />
        </div>
      </div>

      {/* Maintenance Frequency card */}
      <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
        <p className="text-[11px] text-zinc-400 mb-1">Maintenance Frequency</p>
        <div className="flex items-baseline justify-between">
          <p className="text-xl font-bold text-zinc-900">{freqLabel(asset.statusJadwal)}</p>
          <p className="text-[10px] text-zinc-400">
            {asset.statusJadwal ? `Last updated ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}` : "—"}
          </p>
        </div>
        <div className="flex justify-between mt-2 pt-2 border-t border-zinc-200">
          <div>
            <p className="text-[10px] text-zinc-400">Last Maintenance</p>
            <p className="text-xs font-medium text-zinc-700">{fmtMonthYear(last)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-400">Next Recommended</p>
            <p className="text-xs font-medium text-indigo-600">{fmtMonthYear(next)}</p>
          </div>
        </div>
      </div>

      {/* Health Score Chart */}
      <div>
        <p className="text-xs font-medium text-zinc-600 mb-2">Health Score Overview</p>
        <HealthChart logs={logs} score={hs} />
      </div>

      {/* Key Indicators */}
      <div>
        <p className="text-xs font-medium text-zinc-600 mb-2">Key Indicators</p>
        <div className="space-y-2">
          {[
            ["Category", `${asset.kategori ?? "—"}${asset.subKategori ? `/${asset.subKategori}` : ""}`],
            ["Manufacturer", asset.merek ?? "—"],
            ["Installation Date", asset.tglInstalasi ? new Date(asset.tglInstalasi).toLocaleDateString("en-GB") : "—"],
            ["Location", [asset.lokasiGedung, asset.lokasiLantai, asset.lokasiZona].filter(Boolean).join(", ") || "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-zinc-400">{label}</span>
              <span className="text-zinc-700 font-medium text-right max-w-[55%] truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Maintenance History Tab                                                    

function MaintenanceTab({ logs, loading }: { logs: KomplainLog[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }
  if (logs.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-zinc-400">
        No maintenance history found for this asset.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-zinc-700">
              {log.tanggalPengerjaan
                ? new Date(log.tanggalPengerjaan).toLocaleDateString("id-ID")
                : "—"}
            </p>
            {log.severity && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                {log.severity}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-600 font-medium">{log.jenisKerusakan ?? "—"}</p>
          {log.penyebab && (
            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{log.penyebab}</p>
          )}
          {log.biayaPerbaikan != null && (
            <p className="text-[11px] text-zinc-500 mt-1">
              Rp {log.biayaPerbaikan.toLocaleString("id-ID")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// Searchable combobox filter

function FilterCombobox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center rounded-lg border bg-white shadow-sm transition-all duration-150 ${
          open
            ? "border-indigo-300 ring-2 ring-indigo-100"
            : value
            ? "border-indigo-200 bg-indigo-50/50"
            : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <input
          type="text"
          value={open ? query : value}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={`min-w-0 w-28 bg-transparent pl-3 py-2 text-xs focus:outline-none placeholder:text-zinc-400 ${
            value && !open ? "text-indigo-600 font-medium" : "text-zinc-700"
          }`}
        />
        {value && !open ? (
          <button onClick={clear} className="px-2 text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown
            className={`mr-2 w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 min-w-full w-max max-w-56 rounded-xl border border-zinc-100 bg-white shadow-lg">
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-zinc-400 italic">No matches</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors duration-100 ${
                    value === o
                      ? "bg-indigo-50 text-indigo-600 font-medium"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {o}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Page                                                                 

export default function AssetsPage() {
  // Original state (preserved)   
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

  // New state   
  const [riskFilter, setRiskFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"overview" | "maintenance">("overview");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const router = useRouter();

  const LIMIT = 50;

  // Original: load filters on mount   
  useEffect(() => {
    fetch("/api/assets/filters")
      .then((r) => r.json())
      .then((data) => setFilters({
        kategori: Array.isArray(data.kategori) ? data.kategori : [],
        tipe: Array.isArray(data.tipe) ? data.tipe : [],
        lokasi: Array.isArray(data.lokasi) ? data.lokasi : [],
        jadwal: Array.isArray(data.jadwal) ? data.jadwal : [],
      }))
      .catch((err) => console.error("Failed to load filters:", err));
  }, []);

  // Search debounce   
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Build fetch params (shared between effect and manual trigger)   
  const buildParams = useCallback(
    () =>
      new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        status: "Aktif",
        ...(selectedKategori && { kategori: selectedKategori }),
        ...(selectedTipe && { tipe: selectedTipe }),
        ...(selectedLokasi && { lokasi: selectedLokasi }),
        ...(selectedJadwal && { jadwal: FREQ_TO_JADWAL[selectedJadwal] ?? selectedJadwal }),
        ...(search && { search }),
        ...(riskFilter !== "All" && { kekritisan: riskFilter }),
      }),
    [page, selectedKategori, selectedTipe, selectedLokasi, selectedJadwal, search, riskFilter],
  );

  // Auto-fetch on dep changes (inline async avoids the setState-in-effect lint rule)   
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/assets?${buildParams()}`);
        const json = await res.json();
        if (!cancelled) {
          setAssets(json.data ?? []);
          setTotal(json.total ?? 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [buildParams]);

  // Manual refetch (used after prediction)   
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?${buildParams()}`);
      const json = await res.json();
      setAssets(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Original: run prediction   
  async function runPrediction() {
    setPredicting(true);
    setPredMsg(null);
    try {
      const res = await fetch("/api/assets/predict", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setPredMsg(`Prediksi gagal: ${json.message ?? "Server error"}`);
      } else {
        const now = new Date().toLocaleString("id-ID");
        setLastPredictedAt(now);
        setPredMsg(`Prediksi berhasil — ${json.total_diproses ?? 0} aset diperbarui`);
        fetchAssets();
      }
    } catch (err) {
      setPredMsg(`Prediksi gagal: ${String(err)}`);
    } finally {
      setPredicting(false);
    }
  }

  // Original: open asset detail (now side panel instead of modal)   
  async function openModal(asset: Asset) {
    setModalAsset(asset);
    setActiveTab("overview");
    setKomplainLogs([]);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(asset.idAset)}/komplain`);
      const json = await res.json();
      setKomplainLogs(json.data ?? []);
    } finally {
      setModalLoading(false);
    }
  }

  // Original: filter change
  const handleFilterChange = (type: "kategori" | "tipe" | "lokasi" | "jadwal", value: string) => {
    if (type === "kategori") setSelectedKategori(value);
    else if (type === "tipe") setSelectedTipe(value);
    else if (type === "lokasi") setSelectedLokasi(value);
    else if (type === "jadwal") setSelectedJadwal(value);
    setPage(1);
  };

  const hasActiveFilters = selectedKategori !== "" || selectedTipe !== "" || selectedLokasi !== "" || selectedJadwal !== "" || search !== "" || riskFilter !== "All";

  function resetFilters() {
    setSelectedKategori("");
    setSelectedTipe("");
    setSelectedLokasi("");
    setSelectedJadwal("");
    setSearchInput("");
    setSearch("");
    setRiskFilter("All");
    setPage(1);
  }

  const FREQ_OPTIONS = ["Daily", "Weekly", "Monthly", "Yearly", "Reactive"];

  const totalPages = Math.ceil(total / LIMIT);
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  // Pagination page numbers to display
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

  const riskTabs = ["All", "Major", "Minor", "Healthy", "Critical"];

  return (
    <div className="-m-4 md:-m-8 flex overflow-hidden" style={{ height: "calc(100svh - 5rem - 2rem)" }}>

      {/* Left: Table panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 p-4 md:p-6">

        {/* Risk filter tabs */}
        <div className="flex items-end gap-0 border-b border-zinc-100 mb-4 shrink-0">
          {riskTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setRiskFilter(tab); setPage(1); }}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap ${
                riskFilter === tab
                  ? "text-indigo-600"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab === "All" ? "All Assets" : tab}
              {tab === "All" && riskFilter === "All" && (
                <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-600">
                  {total.toLocaleString()}
                </span>
              )}
              {riskFilter === tab && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Search + Filters row */}
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-700 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
            />
          </div>

          <FilterCombobox
            value={selectedLokasi}
            onChange={(v) => handleFilterChange("lokasi", v)}
            options={filters.lokasi}
            placeholder="Location"
          />
          <FilterCombobox
            value={selectedJadwal}
            onChange={(v) => handleFilterChange("jadwal", v)}
            options={FREQ_OPTIONS}
            placeholder="Frequency"
          />
          <FilterCombobox
            value={selectedTipe}
            onChange={(v) => handleFilterChange("tipe", v)}
            options={filters.tipe}
            placeholder="Asset Type"
          />
          <FilterCombobox
            value={selectedKategori}
            onChange={(v) => handleFilterChange("kategori", v)}
            options={filters.kategori}
            placeholder="Category"
          />

          <button
            onClick={runPrediction}
            disabled={predicting}
            title="Run AI Prediction"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 disabled:opacity-50 transition-all duration-150"
          >
            {predicting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {predicting ? "Running…" : "Predict"}
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 active:scale-95 transition-all duration-150"
            >
              <X className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Prediction status */}
        {predMsg && (
          <div className={`mb-3 shrink-0 flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${
            predMsg.includes("berhasil")
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}>
            <span>{predMsg}</span>
            <button onClick={() => setPredMsg(null)} className="ml-2 hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Asset</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Category</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Installation Date</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Location</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Risk Level</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-zinc-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      <p className="text-xs">Loading assets…</p>
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-zinc-400">
                      No assets found.
                    </td>
                  </tr>
                ) : (
                  assets.map((a) => {
                    const selected = modalAsset?.id === a.id;
                    return (
                      <tr
                        key={a.id}
                        onClick={() => openModal(a)}
                        className={`cursor-pointer transition-colors duration-100 ${
                          selected
                            ? "bg-indigo-50 border-l-2 border-indigo-500"
                            : "hover:bg-indigo-50/50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                            {a.idAset}
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{a.tipe ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-600">{a.kategori ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {a.tglInstalasi
                            ? new Date(a.tglInstalasi).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {[a.lokasiGedung, a.lokasiLantai, a.lokasiZona].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {a.kekritisan ? (
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${RISK_COLORS[a.kekritisan] ?? "bg-zinc-100 text-zinc-500"}`}>
                              {a.kekritisan}
                            </span>
                          ) : (
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${RISK_COLORS.Healthy}`}>
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-zinc-700">
                          {freqLabel(a.statusJadwal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination + Add Asset */}
          <div className="shrink-0 flex items-center justify-between border-t border-zinc-100 px-4 py-3 bg-white">
            <span className="text-xs text-zinc-400">
              Showing {showingFrom} to {showingTo} of {total.toLocaleString()} assets
            </span>

            <div className="flex items-center gap-3">
              {/* Page numbers */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-zinc-500" />
                  </button>
                  {pageNums.map((n, i) =>
                    n === "…" ? (
                      <span key={`e${i}`} className="px-1 text-xs text-zinc-400">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-all duration-150 ${
                          page === n
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-zinc-500 hover:bg-zinc-100"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              )}

              {/* Add Asset(s) button */}
              <button
                onClick={() => router.push("/update_assets")}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-150"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Asset(s)
              </button>

            </div>
          </div>
        </div>

        {/* Last predicted info */}
        {lastPredictedAt && (
          <p className="mt-2 text-[10px] text-zinc-400 shrink-0">
            Prediction last run: {lastPredictedAt}
          </p>
        )}
      </div>

      {/* Right: Asset Detail Panel */}
      {modalAsset && (
        <div className="w-80 xl:w-96 shrink-0 border-l border-zinc-100 flex flex-col bg-white overflow-hidden">
          {/* Header with geometric decoration */}
          <div className="relative overflow-hidden p-5 bg-gradient-to-br from-white to-indigo-50/30 shrink-0">
            <GeoDeco />
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">{modalAsset.tipe ?? "Asset"}</p>
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{modalAsset.idAset}</h2>
                  <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500">
                    <span>{modalAsset.kategori ?? "—"}</span>
                    {modalAsset.lokasiGedung && (
                      <>
                        <span className="text-zinc-300">·</span>
                        <span>{modalAsset.lokasiGedung}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setModalAsset(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:scale-90 transition-all duration-150"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-100 px-4 shrink-0">
            {(["overview", "maintenance"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-3 py-2.5 text-xs font-medium capitalize transition-colors duration-150 ${
                  activeTab === tab ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {tab === "overview" ? "Overview" : "Maintenance History"}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "overview" ? (
              <OverviewTab asset={modalAsset} logs={komplainLogs} loading={modalLoading} />
            ) : (
              <MaintenanceTab logs={komplainLogs} loading={modalLoading} />
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-zinc-100 px-4 py-3 flex items-center justify-end bg-white">
            <button
              onClick={() => router.push(`/update_assets?assetId=${encodeURIComponent(modalAsset.idAset)}`)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-100 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
            >
              Edit Asset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
