"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronDown, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, Plus, X, Pencil, AlertTriangle,
  ArrowRight, ArrowDown, ArrowDownUp, CheckCircle2, Wrench, User, Trash2,
  CalendarDays,
} from "lucide-react";

// Types                                                                    

type PanelView = "overview" | "edit" | "maintenance-history" | "add-maintenance" | "finish-maintenance";

interface Asset {
  id: number;
  idAset: number;
  nama: string | null;
  merek: string | null;
  model: string | null;
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
  confidence: number | null;
  latestSeverity: string | null;
}

interface KomplainLog {
  id: number;
  idAset: number;
  tanggalPerencanaan: string | null;
  tanggalPengerjaan: string | null;
  tanggalSelesai: string | null;
  maintenanceType: string | null;
  jenisKerusakan: string | null;
  severity: string | null;
  severityScore: number | null;
  penyebab: string | null;
  biayaPerbaikan: number | null;
  sparePartDigunakan: string | null;
  teknisiPelaksana: string | null;
}

interface ReplaceLog {
  id: number;
  idAsetLama: number;
  namaAsetLama: string | null;
  kategori: string | null;
  tipe: string | null;
  idAsetBaru: number | null;
  namaAsetBaru: string | null;
  merekAsetBaru: string | null;
  modelAsetBaru: string | null;
  tanggalPenggantian: string | null;
  alasanPenggantian: string | null;
  biayaPenggantian: number | null;
}

// Unified shape for the maintenance history list display
interface MaintenanceEntry {
  id: number;
  source: "komplain" | "penggantian";
  maintenanceType: string;
  tanggalPengerjaan: string | null;
  tanggalSelesai: string | null;
  biaya: number | null;
  severity: string | null;
  // Repair / Preventive fields
  jenisKerusakan?: string | null;
  penyebab?: string | null;
  sparePartDigunakan?: string | null;
  teknisiPelaksana?: string | null;
  // Replace fields
  idAsetBaru?: number | null;
  namaAsetLama?: string | null;
  namaAsetBaru?: string | null;
  merekAsetBaru?: string | null;
  modelAsetBaru?: string | null;
  alasanPenggantian?: string | null;
}

interface RepairForm {
  tanggalPerencanaan: string;
  tanggalPengerjaan: string;
  tanggalSelesai: string;
  jenisKerusakan: string;
  penyebab: string;
  severity: string;
  biayaPerbaikan: string;
  sparePartDigunakan: string;
  teknisiPelaksana: string;
}

interface ReplaceForm {
  tanggalPengerjaan: string;
  prefix: string;
  alasanPenggantian: string;
  biayaPenggantian: string;
}

interface StartRepairForm {
  tanggalPerencanaan: string;
  tanggalPengerjaan: string;
}

interface FinishRepairForm {
  tanggalSelesai: string;
  jenisKerusakan: string;
  penyebab: string;
  severity: string;
  biayaPerbaikan: string;
  sparePartDigunakan: string;
  teknisiPelaksana: string;
}

interface UnderMaintenanceAsset {
  id: number;
  idAset: number;
  nama: string | null;
  kategori: string | null;
  tipe: string | null;
  lokasiGedung: string | null;
  lokasiLantai: string | null;
  lokasiZona: string | null;
  kekritisan: string | null;
  ticketId: number | null;
  tanggalPerencanaan: string | null;
  tanggalPengerjaan: string | null;
}

interface Filters {
  kategori: string[];
  tipe: string[];
  subKategori: string[];
  lokasi: string[];
  jadwal: string[];
}

// Constants                                                                

const RISK_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border border-red-200",
  Major: "bg-red-50 text-red-500 border border-red-200",
  Minor: "bg-yellow-50 text-yellow-600 border border-yellow-200",
};

const FREQ_LABEL: Record<string, string> = {
  Harian: "Daily", Mingguan: "Weekly", Bulanan: "Monthly", Tahunan: "Yearly", Reaktif: "Reactive",
};

const FREQ_TO_JADWAL: Record<string, string> = {
  Daily: "Harian", Weekly: "Mingguan", Monthly: "Bulanan", Yearly: "Tahunan", Reactive: "Reaktif",
};

const FREQ_OPTIONS = ["Daily", "Weekly", "Monthly", "Yearly", "Reactive"];
const SEVERITY_TABS = ["All Assets", "Fatal", "At Risk", "Healthy"];

// Severity — displayed in English, stored in Indonesian to match existing DB data
const SEVERITY_OPTIONS = ["Fatal", "Serious", "Medium", "Mild"];
const SEVERITY_EN_TO_ID: Record<string, string> = {
  Fatal: "Fatal", Serious: "Berat", Medium: "Sedang", Mild: "Ringan",
};
const SEVERITY_ID_TO_EN: Record<string, string> = {
  Fatal: "Fatal", Berat: "Serious", Sedang: "Medium", Ringan: "Mild",
};

const SEVERITY_SCORE_MAP: Record<string, number> = {
  Fatal: 5, Serious: 4, Medium: 3, Mild: 2,
};

const SEVERITY_BADGE: Record<string, string> = {
  Fatal: "bg-red-100 text-red-700",
  Serious: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Mild: "bg-green-100 text-green-700",
};

// Asset status — English display, Indonesian storage
const STATUS_OPTIONS = ["Active", "Non-active"];
const STATUS_ID_TO_EN: Record<string, string> = {
  Aktif: "Active", Rusak: "Non-active", Diganti: "Non-active", Dihapus: "Non-active",
  "Under Maintenance": "Under Maintenance",
};

// Zone — kept in Indonesian for both display and storage
const ZONE_OPTIONS = ["Timur", "Barat", "Utara", "Selatan"];

// Priority to company — stored in master_aset.kekritisan (same values as the Priority column)
const PRIORITY_OPTIONS = ["Critical", "Major", "Minor"];

// Tomorrow's date as YYYY-MM-DD — used as max on all date inputs
function maxDateStr(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

function severityToEn(dbVal: string | null): string | null {
  if (!dbVal) return null;
  return SEVERITY_ID_TO_EN[dbVal] ?? dbVal;
}

const INIT_REPAIR: RepairForm = {
  tanggalPerencanaan: "", tanggalPengerjaan: "", tanggalSelesai: "",
  jenisKerusakan: "", penyebab: "", severity: "", biayaPerbaikan: "",
  sparePartDigunakan: "", teknisiPelaksana: "",
};

const INIT_REPLACE: ReplaceForm = {
  tanggalPengerjaan: "", prefix: "", alasanPenggantian: "", biayaPenggantian: "",
};

// Utilities                                                                

function freqLabel(j: string | null): string {
  return j ? (FREQ_LABEL[j] ?? j) : "Reactive";
}

function assetAgeParts(tglInstalasi: string | null | Date): { value: number; unit: string } {
  if (!tglInstalasi) return { value: 0, unit: "Days" };
  const ms = Date.now() - new Date(tglInstalasi as string).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days >= 365) { const y = Math.floor(days / 365); return { value: y, unit: y === 1 ? "Year" : "Years" }; }
  if (days >= 30) { const m = Math.floor(days / 30); return { value: m, unit: "Months" }; }
  if (days >= 7) { const w = Math.floor(days / 7); return { value: w, unit: "Weeks" }; }
  return { value: days, unit: days === 1 ? "Day" : "Days" };
}

// No complaint history is treated as "Healthy" — consistent with the Healthy
// severity tab/count, which also group assets with no recent failures.
function getHealthStatusDisplay(latestSeverity: string | null): { label: string; css: string } {
  if (latestSeverity === "Fatal") return { label: "Fatal", css: "bg-red-100 text-red-700 border border-red-200" };
  if (latestSeverity === "Berat" || latestSeverity === "Sedang") return { label: "At Risk", css: "bg-amber-100 text-amber-700 border border-amber-200" };
  return { label: "Healthy", css: "bg-green-100 text-green-700 border border-green-200" };
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

function currentLife(tglInstalasi: string | null): string {
  if (!tglInstalasi) return "—";
  const ms = Date.now() - new Date(tglInstalasi).getTime();
  const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365));
  if (years >= 1) return `${years} Year${years > 1 ? "s" : ""}`;
  const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30));
  if (months >= 1) return `${months} Month${months > 1 ? "s" : ""}`;
  const weeks = Math.floor(ms / (1000 * 60 * 60 * 24 * 7));
  if (weeks >= 1) return `${weeks} Week${weeks > 1 ? "s" : ""}`;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days} Day${days !== 1 ? "s" : ""}`;
}

function parseBiaya(val: string): number {
  return parseInt(val.replace(/\D/g, ""), 10) || 0;
}

// Live thousand-separator formatting for cost inputs, e.g. "100000" -> "100.000"
function formatRupiahInput(val: string): string {
  const digits = val.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

function fmtLogDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function fmtCost(n: number | null): string {
  if (n == null) return "Rp.0,00";
  return `Rp.${n.toLocaleString("id-ID")}`;
}

// Shared UI helpers                                                         

function ToggleGroup({
  label, options, value, onChange, disabledOptions,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void; disabledOptions?: string[] }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-700 mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const disabled = disabledOptions?.includes(opt) ?? false;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-[border-color,background-color,color,box-shadow] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:border-zinc-200 disabled:hover:text-zinc-500 ${
                value === opt
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Decoration + Chart                                                        

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

// "YYYY-MM" → "Mon YYYY"
function ymToLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}

// Shift a "YYYY-MM" string by n months
function addMonthsYM(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Period picker for the downtime chart — same behaviour as the dashboard's
// DateRangeFilter (pick a start month, window is start +11). Rendered through a
// portal so the panel's overflow-y-auto can't clip the dropdown.
function DowntimePeriodFilter({ startMonth, onChange }: { startMonth: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const toMonth = addMonthsYM(startMonth, 11);

  const openMenu = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (btnRef.current?.contains(t) || t.closest("[data-dt-period]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors duration-150 cursor-pointer shadow-sm"
      >
        <CalendarDays className="w-3 h-3 text-zinc-400 shrink-0" />
        <span>{ymToLabel(startMonth)} – {ymToLabel(toMonth)}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {typeof document !== "undefined" && createPortal(
        <div
          data-dt-period
          className="fixed z-[200] w-60 rounded-2xl border border-zinc-100 bg-white p-4 shadow-2xl"
          style={{
            top: pos.top, right: pos.right,
            opacity: open ? 1 : 0,
            transform: open ? "scale(1)" : "scale(0.96)",
            pointerEvents: open ? "auto" : "none",
            transformOrigin: "top right",
            transition: "opacity 150ms cubic-bezier(0.23,1,0.32,1), transform 150ms cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <div className="mb-3">
            <p className="text-sm font-semibold text-zinc-800">Select Period</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Chart always displays 12 months</p>
          </div>
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1.5">Start Month</p>
              <input
                type="month"
                value={startMonth}
                onChange={e => { if (e.target.value) onChange(e.target.value); }}
                className="w-full text-xs border border-zinc-200 rounded-xl px-3 py-2 text-zinc-700 bg-zinc-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent cursor-pointer font-medium"
              />
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <div className="flex-1 h-px bg-zinc-100" />
              <span className="text-[10px] text-zinc-400">auto</span>
              <div className="flex-1 h-px bg-zinc-100" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1.5">End Month</p>
              <div className="w-full rounded-xl px-3 py-2 bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700">{ymToLabel(toMonth)}</span>
                <span className="text-[10px] text-indigo-400 bg-indigo-100 rounded-full px-1.5 py-0.5">+11 mo</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-xl bg-indigo-600 text-white text-xs font-semibold py-2 hover:bg-indigo-700 active:scale-[0.97] transition duration-150 cursor-pointer"
          >
            Apply
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

function DowntimeChart({ logs }: { logs: KomplainLog[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // Default window: the rightmost (12th) month is the month of the most recent
  // completion (tanggal_selesai); start = that month − 11. A rolling 12-month
  // window keeps cross-year maintenance visible (started Dec, finished Jan).
  const [startMonth, setStartMonth] = useState(() => {
    const last = logs.reduce<Date | null>((acc, l) => {
      const raw = l.tanggalSelesai ?? l.tanggalPengerjaan;
      if (!raw) return acc;
      const d = new Date(raw);
      return !acc || d > acc ? d : acc;
    }, null);
    const base = last ?? new Date();
    const d = new Date(base.getFullYear(), base.getMonth() - 11, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const [sy, sm] = startMonth.split("-").map(Number);
  const startAbs = sy * 12 + (sm - 1);

  // Downtime (days) per month, bucketed by the month work started, within the window.
  const dayMs = 86_400_000;
  const byMonth = Array.from({ length: 12 }, () => 0);
  for (const log of logs) {
    if (!log.tanggalPengerjaan) continue;
    const start = new Date(log.tanggalPengerjaan);
    const idx = start.getFullYear() * 12 + start.getMonth() - startAbs;
    if (idx < 0 || idx > 11) continue;
    const end = log.tanggalSelesai ? new Date(log.tanggalSelesai) : null;
    const days = end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / dayMs)) : 0;
    byMonth[idx] += days;
  }
  const data = byMonth.map((value, i) => {
    const d = new Date(sy, sm - 1 + i, 1);
    return {
      value,
      label: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
      short: d.toLocaleString("en-US", { month: "narrow" }),
    };
  });

  if (logs.length === 0) {
    return <p className="py-8 text-center text-[11px] text-zinc-400">No maintenance records yet</p>;
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const step = Math.max(Math.ceil(maxVal / 4 / 5) * 5, 5);
  const yMax = Math.ceil(maxVal / step) * step;
  const gridLines = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

  const W = 300, H = 150;
  const PL = 22, PT = 8, PB = 18, PR = 6;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const bottomY = PT + chartH;
  const slotW = chartW / 12;
  const barW = Math.min(slotW * 0.6, 16);
  const MIN_BH = 3;

  const bars = data.map((d, i) => {
    const cx = PL + i * slotW + slotW / 2;
    const bh = d.value > 0 ? Math.max((d.value / yMax) * chartH, MIN_BH) : 0;
    return { ...d, cx, x: cx - barW / 2, y: bottomY - bh, bh };
  });

  const TW = 70, TH = 34;
  const tipX = hovered !== null ? Math.min(Math.max(bars[hovered].cx - TW / 2, 0), W - TW) : 0;
  const tipY = hovered !== null ? Math.max(bars[hovered].y - TH - 4, 0) : 0;

  return (
    <div>
      <div className="flex justify-end mb-1.5">
        <DowntimePeriodFilter startMonth={startMonth} onChange={v => { setStartMonth(v); setHovered(null); }} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }}
        onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id="dtBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F75FF" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="dtBarHov" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {gridLines.map(v => {
          const y = bottomY - (v / yMax) * chartH;
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f1f5f9" strokeWidth="0.7" strokeDasharray="3 2" />
              <text x={PL - 4} y={y + 3} textAnchor="end" fontSize="7.5" fill="#a1a1aa">{v}</text>
            </g>
          );
        })}
        <line x1={PL} y1={bottomY} x2={W - PR} y2={bottomY} stroke="#e4e4e7" strokeWidth="0.7" />

        {bars.map((b, i) => (
          <g key={i}>
            {b.bh > 0 ? (
              <rect x={b.x} y={b.y} width={barW} height={b.bh} rx="2.5"
                fill={hovered === i ? "url(#dtBarHov)" : "url(#dtBar)"}
                opacity={hovered !== null && hovered !== i ? 0.55 : 1}
                style={{
                  transformOrigin: `${b.cx}px ${bottomY}px`,
                  transform: mounted || reduceMotion ? "scaleY(1)" : "scaleY(0)",
                  transition: reduceMotion ? "none" : `transform 0.5s cubic-bezier(0.34,1.4,0.64,1) ${i * 0.03}s, opacity 0.15s`,
                }} />
            ) : (
              <rect x={b.x} y={bottomY - MIN_BH} width={barW} height={MIN_BH} rx="1.5"
                fill="none" stroke="#e4e4e7" strokeWidth="1" strokeDasharray="2 2" />
            )}
            <rect x={b.cx - slotW / 2} y={PT} width={slotW} height={chartH}
              fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={() => setHovered(i)} />
            <text x={b.cx} y={H - 5} textAnchor="middle" fontSize="8"
              fill={hovered === i ? "#6366f1" : "#a1a1aa"} style={{ transition: "fill 0.15s" }}>
              {b.short}
            </text>
          </g>
        ))}

        {hovered !== null && (
          <g pointerEvents="none">
            <rect x={tipX} y={tipY} width={TW} height={TH} rx="6" fill="#0f172a" />
            <text x={tipX + TW / 2} y={tipY + 13} textAnchor="middle" fontSize="8" fill="#94a3b8">
              {bars[hovered].label}
            </text>
            <text x={tipX + TW / 2} y={tipY + 27} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
              {bars[hovered].value} {bars[hovered].value === 1 ? "day" : "days"}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// Incomplete Warning Modal                                                  

function IncompleteWarningModal({ onContinue, onLeave }: { onContinue: () => void; onLeave: () => void }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setVis(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${vis ? "opacity-100" : "opacity-0"}`}>
      <div className={`bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4 transition-[opacity,transform] duration-200 ${vis ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Incomplete Form</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Some required fields (*) are still empty. Do you want to keep filling them in?
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onLeave}
            className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            Discard
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            Keep Editing
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Asset Warning Modal — same design/animation as IncompleteWarningModal, red accent
function DeleteAssetModal({ onCancel, onConfirm, deleting }: { onCancel: () => void; onConfirm: () => void; deleting: boolean }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setVis(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${vis ? "opacity-100" : "opacity-0"}`}>
      <div className={`bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4 transition-[opacity,transform] duration-200 ${vis ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Delete Asset</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              This asset will be marked as deleted and moved to the Inactive list. You can still find it there later. Delete it?
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Leave (unsaved changes) Warning Modal

function LeaveWarningModal({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setVis(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${vis ? "opacity-100" : "opacity-0"}`}>
      <div className={`bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4 transition-[opacity,transform] duration-200 ${vis ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Unsaved Changes</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              You have unsaved changes. Are you sure you want to leave? Any data you entered will be lost.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onLeave}
            className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            Leave
          </button>
          <button
            onClick={onStay}
            className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            Keep Editing
          </button>
        </div>
      </div>
    </div>
  );
}

// Counts up from 0 to value with an ease-out curve (same as the dashboard KPIs).
function AnimatedCount({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    let frame = 0;
    const totalFrames = Math.round(duration / 16);
    const timer = setInterval(() => {
      frame++;
      const eased = 1 - Math.pow(1 - Math.min(frame / totalFrames, 1), 3);
      setDisplay(Math.round(eased * value));
      if (frame >= totalFrames) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}

// Animated count badge for the active severity tab.
// A CSS keyframe (defined in globals.css) replays on every mount — reliable across
// re-renders where a single rAF toggle would sometimes skip the transition.
function TabCountBadge({ count }: { count: number }) {
  return (
    <span className="animate-badge-pop ml-1.5 inline-block rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-600 tabular-nums">
      <AnimatedCount value={count} />
    </span>
  );
}

// Overview Content

// Skeleton that mirrors the overview layout — keeps panel loading consistent with the table
function OverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none">
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map(i => (
          <div key={i}>
            <div className="h-2.5 w-16 rounded bg-zinc-100 mb-2" />
            <div className="h-7 w-20 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 space-y-3">
        <div className="h-2.5 w-40 rounded bg-zinc-100" />
        <div className="h-5 w-24 rounded bg-zinc-200" />
        <div className="flex justify-between pt-2 border-t border-zinc-200">
          <div className="h-3 w-20 rounded bg-zinc-200" />
          <div className="h-3 w-20 rounded bg-zinc-200" />
        </div>
      </div>
      <div>
        <div className="h-2.5 w-32 rounded bg-zinc-100 mb-2" />
        <div className="h-20 w-full rounded-lg bg-zinc-100" />
      </div>
      <div className="space-y-2.5">
        <div className="h-2.5 w-24 rounded bg-zinc-100 mb-1" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-20 rounded bg-zinc-100" />
            <div className="h-3 w-24 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewContent({ asset, logs, loading }: { asset: Asset; logs: KomplainLog[]; loading: boolean }) {
  if (loading) {
    return <OverviewSkeleton />;
  }

  const age = assetAgeParts(asset.tglInstalasi);
  const conf = asset.confidence != null ? Math.round(asset.confidence * 100) : null;
  const last = lastMaintenance(logs);
  const next = nextRecommended(last, asset.statusJadwal);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-zinc-500 mb-0.5">Asset Age</p>
          <p className="text-2xl font-bold text-zinc-800">
            {age.value} <span className="text-xs font-normal text-zinc-500">{age.unit}</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500 mb-0.5">Confidence</p>
          <p className="text-2xl font-bold text-zinc-800">
            {conf != null ? `${conf}%` : <span className="text-zinc-500 text-sm font-medium">Run Predict</span>}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
        <p className="text-[11px] text-zinc-500 mb-1">Recommended Maintenance Frequency</p>
        <div className="flex items-baseline justify-between">
          <p className="text-xl font-bold text-zinc-900">{freqLabel(asset.statusJadwal)}</p>
          <p className="text-[10px] text-zinc-500">
            {asset.statusJadwal ? `Last updated on ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}` : "—"}
          </p>
        </div>
        <div className="flex justify-between mt-2 pt-2 border-t border-zinc-200">
          <div>
            <p className="text-[10px] text-zinc-500">Last Maintenance</p>
            <p className="text-xs font-medium text-zinc-700">{fmtMonthYear(last)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500">Next Recommended</p>
            <p className="text-xs font-medium text-indigo-600">{fmtMonthYear(next)}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-600 mb-2">Downtime Overview</p>
        <DowntimeChart key={asset.idAset} logs={logs} />
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-600 mb-2">Key Indicators</p>
        <div className="space-y-2">
          {[
            ["Category", `${asset.kategori ?? "—"}${asset.subKategori ? `/${asset.subKategori}` : ""}`],
            ["Manufacturer", asset.merek ?? "—"],
            ["Equipment Model", asset.model ?? "—"],
            ["Installation Date", asset.tglInstalasi ? new Date(asset.tglInstalasi).toLocaleDateString("en-GB") : "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-zinc-500">{label}</span>
              <span className="text-zinc-700 font-medium text-right max-w-[55%] truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Edit Asset Form                                                           

function EditAssetForm({
  asset, filters, onSave, onCancel, onDelete, onGoToReplace, onDirtyChange, onToast,
}: {
  asset: Asset;
  filters: Filters;
  onSave: (updated: Partial<Asset>) => void;
  onCancel: () => void;
  onDelete: () => void;
  onGoToReplace: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onToast: (type: "success" | "error", message: string) => void;
}) {
  // Status & zone held in English for display; mapped back to Indonesian on save
  const initialForm = {
    nama: asset.nama ?? "",
    status: STATUS_ID_TO_EN[asset.status] ?? "Active",
    tipe: asset.tipe ?? "",
    kategori: asset.kategori ?? "",
    subKategori: asset.subKategori ?? "",
    merek: asset.merek ?? "",
    model: asset.model ?? "",
    tglInstalasi: asset.tglInstalasi ? asset.tglInstalasi.substring(0, 10) : "",
    lokasiGedung: asset.lokasiGedung ?? "",
    lokasiLantai: asset.lokasiLantai ?? "",
    lokasiZona: asset.lokasiZona ?? "",
    kekritisan: asset.kekritisan ?? "",
  };
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Replaced/deleted assets can't be reactivated, so the form is read-only (preview)
  const readOnly = asset.status === "Diganti" || asset.status === "Dihapus";

  // Report dirty state up so the page can guard against navigating away with unsaved edits
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const requiredFilled = !!(
    form.nama.trim() && form.status && form.tipe && form.kategori &&
    form.subKategori && form.merek && form.model && form.tglInstalasi &&
    form.lokasiGedung && form.lokasiLantai && form.lokasiZona && form.kekritisan
  );

  async function handleSave() {
    if (!requiredFilled) return;
    setSaving(true);
    setError(null);
    try {
      // Active -> Aktif. Non-active writes Rusak only when the user actually flips an
      // active asset off; an already non-active asset keeps its real status (Diganti/Dihapus).
      const statusId =
        form.status === "Active"
          ? "Aktif"
          : asset.status !== "Aktif"
            ? asset.status
            : "Rusak";
      const zonaId = form.lokasiZona || null;
      const res = await fetch(`/api/assets/${encodeURIComponent(asset.idAset)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama || null,
          status: statusId,
          tipe: form.tipe || null,
          kategori: form.kategori || null,
          subKategori: form.subKategori || null,
          merek: form.merek || null,
          model: form.model || null,
          tglInstalasi: form.tglInstalasi || null,
          lokasiGedung: form.lokasiGedung || null,
          lokasiLantai: form.lokasiLantai || null,
          lokasiZona: zonaId,
          kekritisan: form.kekritisan || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to update");
      onSave({
        nama: form.nama || null, status: statusId,
        tipe: form.tipe || null, kategori: form.kategori || null,
        subKategori: form.subKategori || null, merek: form.merek || null,
        model: form.model || null, tglInstalasi: form.tglInstalasi || null,
        lokasiGedung: form.lokasiGedung || null, lokasiLantai: form.lokasiLantai || null,
        lokasiZona: zonaId, kekritisan: form.kekritisan || null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onToast("error", `Couldn't save changes: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  // Soft delete — mark as "Dihapus" (kept in DB, surfaces in the Inactive list)
  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(asset.idAset)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: asset.nama,
          merek: asset.merek,
          model: asset.model,
          kategori: asset.kategori,
          subKategori: asset.subKategori,
          tipe: asset.tipe,
          tglInstalasi: asset.tglInstalasi,
          lokasiGedung: asset.lokasiGedung,
          lokasiLantai: asset.lokasiLantai,
          lokasiZona: asset.lokasiZona,
          status: "Dihapus",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to delete");
      onDelete();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onToast("error", `Couldn't delete asset: ${msg}`);
      setShowDeleteWarning(false);
      setDeleting(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 shrink-0">
        <p className="text-xs font-medium text-zinc-800">
          {readOnly ? "Asset Information" : "Edit Asset Information"}
        </p>
        {readOnly ? (
          <p className="text-[11px] text-zinc-500 mt-0.5">
            This asset is {asset.status === "Diganti" ? "replaced" : "deleted"} and can no longer be edited.
          </p>
        ) : (
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Replaced this asset with a new one?{" "}
            <button onClick={onGoToReplace} className="text-indigo-600 hover:underline">
              Go to Add Maintenance
            </button>
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3.5">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Asset Name*</label>
          <input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
            placeholder={asset.nama ?? String(asset.idAset)} className={inputCls} disabled={readOnly} />
        </div>

        <ToggleGroup label="Asset Status*" options={STATUS_OPTIONS}
          value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))}
          disabledOptions={readOnly ? STATUS_OPTIONS : undefined} />

        <ToggleGroup label="Priority to Company*" options={PRIORITY_OPTIONS}
          value={form.kekritisan} onChange={v => setForm(f => ({ ...f, kekritisan: v }))}
          disabledOptions={readOnly ? PRIORITY_OPTIONS : undefined} />

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Asset Type*</label>
          <FilterCombobox block disabled={readOnly} value={form.tipe}
            onChange={v => setForm(f => ({ ...f, tipe: v }))}
            options={filters.tipe} placeholder="Select asset type" />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Category*</label>
          <FilterCombobox block disabled={readOnly} value={form.kategori}
            onChange={v => setForm(f => ({ ...f, kategori: v }))}
            options={filters.kategori} placeholder="Select category" />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Sub-category*</label>
          <FilterCombobox block disabled={readOnly} value={form.subKategori}
            onChange={v => setForm(f => ({ ...f, subKategori: v }))}
            options={filters.subKategori} placeholder="Select sub-category" />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Manufacturer*</label>
          <input value={form.merek} onChange={e => setForm(f => ({ ...f, merek: e.target.value }))}
            placeholder="e.g. Mitsubishi Co. Ltd" className={inputCls} disabled={readOnly} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Asset Model*</label>
            <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              placeholder="e.g. MSY-GN-792" className={inputCls} disabled={readOnly} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Installation Date*</label>
            <input type="date" max={maxDateStr()} value={form.tglInstalasi}
              onChange={e => setForm(f => ({ ...f, tglInstalasi: e.target.value }))} className={inputCls} disabled={readOnly} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Building*</label>
            <FilterCombobox block disabled={readOnly} value={form.lokasiGedung}
              onChange={v => setForm(f => ({ ...f, lokasiGedung: v }))}
              options={filters.lokasi} placeholder="Select building" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Floor Level*</label>
            <input value={form.lokasiLantai} onChange={e => setForm(f => ({ ...f, lokasiLantai: e.target.value }))}
              placeholder="e.g. 15" className={inputCls} disabled={readOnly} />
          </div>
        </div>

        <ToggleGroup label="Zone*" options={ZONE_OPTIONS}
          value={form.lokasiZona ?? ""} onChange={v => setForm(f => ({ ...f, lokasiZona: v }))}
          disabledOptions={readOnly ? ZONE_OPTIONS : undefined} />
      </div>

      <div className="shrink-0 border-t border-zinc-100 px-4 py-3 flex items-center justify-between gap-2 bg-white">
        <button onClick={() => setShowDeleteWarning(true)} disabled={readOnly} aria-label="Delete asset"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:scale-100">
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-[0.97] transition-[background-color,transform] duration-150">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!requiredFilled || saving || readOnly}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-[background-color,transform] duration-150">
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Save edit
          </button>
        </div>
      </div>

      {showDeleteWarning && createPortal(
        <DeleteAssetModal
          deleting={deleting}
          onCancel={() => { if (!deleting) setShowDeleteWarning(false); }}
          onConfirm={handleDelete}
        />,
        document.body,
      )}
    </div>
  );
}

// Repair Form Fields                                                        

function RepairFormFields({ form, setForm }: {
  form: RepairForm;
  setForm: React.Dispatch<React.SetStateAction<RepairForm>>;
}) {
  const inputCls = "w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white";

  return (
    <div className="space-y-3.5">
      {/* Dates with stepper */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center pt-[1.65rem] pb-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <div className="flex-1 w-px bg-indigo-200 my-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <div className="flex-1 w-px bg-indigo-200 my-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
        </div>
        <div className="flex-1 space-y-2.5">
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Planned Maintenance</label>
            <input type="date" max={maxDateStr()} value={form.tanggalPerencanaan}
              onChange={e => setForm(f => ({ ...f, tanggalPerencanaan: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Maintenance Execution*</label>
            <input type="date" max={maxDateStr()} value={form.tanggalPengerjaan}
              onChange={e => setForm(f => ({ ...f, tanggalPengerjaan: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Maintenance Done*</label>
            <input type="date" max={maxDateStr()} value={form.tanggalSelesai}
              onChange={e => setForm(f => ({ ...f, tanggalSelesai: e.target.value }))} className={inputCls} />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">What&apos;s Fixed*</label>
        <div className="relative">
          <textarea value={form.jenisKerusakan} rows={2}
            onChange={e => setForm(f => ({ ...f, jenisKerusakan: e.target.value.slice(0, 90) }))}
            placeholder="Fixed outdoor fan..."
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none transition-[border-color,box-shadow] bg-white" />
          <span className="absolute bottom-2 right-3 text-[10px] text-zinc-500">{form.jenisKerusakan.length}/90</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Damage Cause</label>
        <div className="relative">
          <textarea value={form.penyebab} rows={2}
            onChange={e => setForm(f => ({ ...f, penyebab: e.target.value.slice(0, 90) }))}
            placeholder="Someone knocked too hard..."
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none transition-[border-color,box-shadow] bg-white" />
          <span className="absolute bottom-2 right-3 text-[10px] text-zinc-500">{form.penyebab.length}/90</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Severity Level*</label>
        <div className="flex gap-1.5">
          {SEVERITY_OPTIONS.map(s => (
            <button key={s} type="button" onClick={() => setForm(f => ({ ...f, severity: s }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-[border-color,background-color,color,box-shadow] duration-150 active:scale-[0.97] ${
                form.severity === s ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Repair Cost*</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">Rp.</span>
          <input type="text" inputMode="numeric" value={form.biayaPerbaikan} placeholder="100.000"
            onChange={e => setForm(f => ({ ...f, biayaPerbaikan: formatRupiahInput(e.target.value) }))}
            className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Spareparts Involved*</label>
        <input value={form.sparePartDigunakan}
          onChange={e => setForm(f => ({ ...f, sparePartDigunakan: e.target.value }))}
          placeholder="e.g. Thermostat, remote battery" className={inputCls} />
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Technicians Involved*</label>
        <input value={form.teknisiPelaksana}
          onChange={e => setForm(f => ({ ...f, teknisiPelaksana: e.target.value }))}
          placeholder="e.g. Technician 1, Technician 2" className={inputCls} />
      </div>
    </div>
  );
}

// Replace Form Fields                                                       

function ReplaceFormFields({ form, setForm, asset, nextIdAset }: {
  form: ReplaceForm;
  setForm: React.Dispatch<React.SetStateAction<ReplaceForm>>;
  asset: Asset;
  nextIdAset: number | null;
}) {
  const inputCls = "w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white";
  const previewName = form.prefix.trim() && nextIdAset != null
    ? `${form.prefix.trim()}-${nextIdAset}`
    : null;

  return (
    <div className="space-y-3.5">
      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Execution Date*</label>
        <input type="date" max={maxDateStr()} value={form.tanggalPengerjaan}
          onChange={e => setForm(f => ({ ...f, tanggalPengerjaan: e.target.value }))}
          className={inputCls} />
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700 leading-relaxed">
          Make sure to replace asset with the same <strong>Type</strong>, <strong>Category</strong>, and <strong>Sub-Category</strong>
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-700 mb-1.5">Current Asset</p>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-zinc-800">{asset.nama ?? String(asset.idAset)}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {[asset.subKategori, asset.tipe].filter(Boolean).join(" · ") || (asset.kategori ?? "—")}
              </p>
            </div>
            <p className="text-xs text-zinc-500 shrink-0">{asset.merek ?? "—"} {asset.model ?? ""}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <div className="w-px h-3 border-l border-dashed border-zinc-300" />
        <ArrowDown className="w-3.5 h-3.5 text-zinc-300" />
        <div className="w-px h-3 border-l border-dashed border-zinc-300" />
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">New Asset Name Prefix*</label>
        <div className="flex items-center gap-2">
          <input value={form.prefix}
            onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))}
            placeholder="e.g. MAS-SAHX"
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white" />
          <span className="text-xs text-zinc-500 shrink-0">-</span>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-500 min-w-[4.5rem] text-center">
            {nextIdAset ?? "…"}
          </div>
        </div>
        {previewName && (
          <p className="text-[11px] text-indigo-600 font-medium mt-1.5">→ {previewName}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Reason for Replacement*</label>
        <div className="relative">
          <textarea value={form.alasanPenggantian} rows={2}
            onChange={e => setForm(f => ({ ...f, alasanPenggantian: e.target.value.slice(0, 90) }))}
            placeholder="e.g. End of service life..."
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none transition-[border-color,box-shadow] bg-white" />
          <span className="absolute bottom-2 right-3 text-[10px] text-zinc-500">{form.alasanPenggantian.length}/90</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Replacement Cost*</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">Rp.</span>
          <input type="text" inputMode="numeric" value={form.biayaPenggantian} placeholder="100.000"
            onChange={e => setForm(f => ({ ...f, biayaPenggantian: formatRupiahInput(e.target.value) }))}
            className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white" />
        </div>
      </div>
    </div>
  );
}

// Add Maintenance Form (Start Maintenance ticketing)

function AddMaintenanceForm({ asset, initialType = "repair", onSave, onCancel, onDirtyChange, onToast }: {
  asset: Asset;
  initialType?: "repair" | "replace";
  onSave: (result?: { newIdAset?: number; newNama?: string }) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onToast: (type: "success" | "error", message: string) => void;
}) {
  const [type, setType] = useState<"repair" | "replace">(initialType);
  // Repair now uses a simplified 2-field start form
  const [startForm, setStartForm] = useState<StartRepairForm>({ tanggalPerencanaan: "", tanggalPengerjaan: "" });
  const [replace, setReplace] = useState<ReplaceForm>({
    ...INIT_REPLACE,
    prefix: asset.nama?.replace(/-\d+$/, "") ?? "",
  });
  const [nextIdAset, setNextIdAset] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repairBtnRef = useRef<HTMLButtonElement>(null);
  const replaceBtnRef = useRef<HTMLButtonElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean; animate: boolean }>({ left: 0, width: 0, ready: false, animate: false });

  useEffect(() => {
    const btn = type === "repair" ? repairBtnRef.current : replaceBtnRef.current;
    if (!btn) return;
    setPill(prev => ({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true, animate: prev.ready }));
  }, [type]);

  useEffect(() => {
    if (type === "replace") {
      fetch("/api/assets/next-id")
        .then(r => r.json())
        .then(d => setNextIdAset(d.nextId ?? null))
        .catch(() => setNextIdAset(null));
    }
  }, [type]);

  const startRepairDirty = startForm.tanggalPengerjaan.trim() !== "" || startForm.tanggalPerencanaan.trim() !== "";
  const startRepairReady = startForm.tanggalPengerjaan.trim() !== "";

  const replaceReq = [replace.tanggalPengerjaan, replace.prefix, replace.alasanPenggantian, replace.biayaPenggantian];
  const replaceAllFilled = replaceReq.every(v => v.trim() !== "");
  const initialPrefix = asset.nama?.replace(/-\d+$/, "") ?? "";
  const replaceAnyFilled =
    replace.tanggalPengerjaan.trim() !== "" ||
    replace.alasanPenggantian.trim() !== "" ||
    replace.biayaPenggantian.trim() !== "" ||
    replace.prefix.trim() !== initialPrefix.trim();

  const dirty = startRepairDirty || replaceAnyFilled;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  async function handleSave() {
    if (type === "repair") {
      if (!startRepairReady) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/assets/${encodeURIComponent(asset.idAset)}/start-maintenance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tanggalPerencanaan: startForm.tanggalPerencanaan || null,
            tanggalPengerjaan: startForm.tanggalPengerjaan,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Failed to start maintenance");
        onSave();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        onToast("error", `Couldn't start maintenance: ${msg}`);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Replace flow (unchanged)
    if (!replaceAnyFilled) return;
    if (!replaceAllFilled) {
      onToast("error", "Please fill all required fields");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(asset.idAset)}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: replace.prefix,
          tanggalPenggantian: replace.tanggalPengerjaan,
          alasanPenggantian: replace.alasanPenggantian,
          biayaPenggantian: parseBiaya(replace.biayaPenggantian),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      onSave({ newIdAset: json.newIdAset, newNama: json.newNama });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onToast("error", `Couldn't save replacement log: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-zinc-800">
            {type === "repair" ? "Start Maintenance Ticket" : "Add Maintenance Log"}
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}

        <div className="mb-4">
          <p className="text-xs font-medium text-zinc-600 mb-2">Maintenance Type</p>
          <div className="relative inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            {pill.ready && (
              <span
                className="absolute inset-y-0.5 rounded-md bg-white shadow-sm pointer-events-none"
                style={{
                  left: `${pill.left}px`,
                  width: `${pill.width}px`,
                  ...(pill.animate && { transition: "left 200ms cubic-bezier(0.23, 1, 0.32, 1), width 200ms cubic-bezier(0.23, 1, 0.32, 1)" }),
                }}
              />
            )}
            <button ref={repairBtnRef} onClick={() => setType("repair")}
              className={`relative z-10 px-4 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                type === "repair" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              }`}>
              Repair
            </button>
            <button ref={replaceBtnRef} onClick={() => setType("replace")}
              className={`relative z-10 px-4 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                type === "replace" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              }`}>
              Replace
            </button>
          </div>
        </div>

        {type === "repair" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700 leading-relaxed">
              Asset will be marked <strong>Under Maintenance</strong> until you finish the ticket.
              Remaining details (severity, cost, technician) are filled when completing.
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-[1.65rem] pb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <div className="flex-1 w-px bg-indigo-200 my-1" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />
              </div>
              <div className="flex-1 space-y-2.5">
                <div>
                  <label className="text-xs font-medium text-zinc-700 mb-1 block">Planned Date</label>
                  <input type="date" max={maxDateStr()} value={startForm.tanggalPerencanaan}
                    onChange={e => setStartForm(f => ({ ...f, tanggalPerencanaan: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700 mb-1 block">Execution Date*</label>
                  <input type="date" max={maxDateStr()} value={startForm.tanggalPengerjaan}
                    onChange={e => setStartForm(f => ({ ...f, tanggalPengerjaan: e.target.value }))}
                    className={inputCls} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ReplaceFormFields form={replace} setForm={setReplace} asset={asset} nextIdAset={nextIdAset} />
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-100 px-4 py-3 flex items-center justify-end gap-2 bg-white">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-[0.97] transition-[background-color,transform] duration-150">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || (type === "repair" ? !startRepairReady : !replaceAllFilled)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.97] transition-[background-color,transform] duration-150">
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {type === "repair" ? "Start Maintenance" : "Save Log"}
        </button>
      </div>
    </div>
  );
}

// Finish Maintenance Form

const INIT_FINISH: FinishRepairForm = {
  tanggalSelesai: "", jenisKerusakan: "", penyebab: "",
  severity: "", biayaPerbaikan: "", sparePartDigunakan: "", teknisiPelaksana: "",
};

function FinishMaintenanceForm({ asset, onSave, onCancel, onToast }: {
  asset: Asset;
  onSave: () => void;
  onCancel: () => void;
  onToast: (type: "success" | "error", message: string) => void;
}) {
  const [form, setForm] = useState<FinishRepairForm>(INIT_FINISH);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = [form.tanggalSelesai, form.jenisKerusakan, form.severity, form.biayaPerbaikan, form.sparePartDigunakan, form.teknisiPelaksana];
  const allFilled = required.every(v => v.trim() !== "");

  const inputCls = "w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white";

  async function handleSave() {
    if (!allFilled) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(asset.idAset)}/finish-maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggalSelesai: form.tanggalSelesai,
          jenisKerusakan: form.jenisKerusakan,
          penyebab: form.penyebab || null,
          severity: SEVERITY_EN_TO_ID[form.severity] ?? form.severity,
          severityScore: SEVERITY_SCORE_MAP[form.severity] ?? null,
          biayaPerbaikan: parseBiaya(form.biayaPerbaikan),
          sparePartDigunakan: form.sparePartDigunakan || null,
          teknisiPelaksana: form.teknisiPelaksana || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to complete maintenance");
      onSave();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onToast("error", `Couldn't finish maintenance: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-3.5">
        <p className="text-xs font-medium text-zinc-800">Complete Maintenance Ticket</p>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Completion Date*</label>
          <input type="date" max={maxDateStr()} value={form.tanggalSelesai}
            onChange={e => setForm(f => ({ ...f, tanggalSelesai: e.target.value }))} className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">What&apos;s Fixed*</label>
          <div className="relative">
            <textarea value={form.jenisKerusakan} rows={2}
              onChange={e => setForm(f => ({ ...f, jenisKerusakan: e.target.value.slice(0, 90) }))}
              placeholder="Fixed outdoor fan..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none transition-[border-color,box-shadow] bg-white" />
            <span className="absolute bottom-2 right-3 text-[10px] text-zinc-500">{form.jenisKerusakan.length}/90</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Damage Cause</label>
          <div className="relative">
            <textarea value={form.penyebab} rows={2}
              onChange={e => setForm(f => ({ ...f, penyebab: e.target.value.slice(0, 90) }))}
              placeholder="Someone knocked too hard..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none transition-[border-color,box-shadow] bg-white" />
            <span className="absolute bottom-2 right-3 text-[10px] text-zinc-500">{form.penyebab.length}/90</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Severity Level*</label>
          <div className="flex gap-1.5">
            {SEVERITY_OPTIONS.map(s => (
              <button key={s} type="button" onClick={() => setForm(f => ({ ...f, severity: s }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-[border-color,background-color,color,box-shadow] duration-150 active:scale-[0.97] ${
                  form.severity === s ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Repair Cost*</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">Rp.</span>
            <input type="text" inputMode="numeric" value={form.biayaPerbaikan} placeholder="100.000"
              onChange={e => setForm(f => ({ ...f, biayaPerbaikan: formatRupiahInput(e.target.value) }))}
              className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Spareparts Involved*</label>
          <input value={form.sparePartDigunakan}
            onChange={e => setForm(f => ({ ...f, sparePartDigunakan: e.target.value }))}
            placeholder="e.g. Thermostat, remote battery" className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Technicians Involved*</label>
          <input value={form.teknisiPelaksana}
            onChange={e => setForm(f => ({ ...f, teknisiPelaksana: e.target.value }))}
            placeholder="e.g. Technician 1, Technician 2" className={inputCls} />
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-100 px-4 py-3 flex items-center justify-end gap-2 bg-white">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-[0.97] transition-[background-color,transform] duration-150">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || !allFilled}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.97] transition-[background-color,transform] duration-150">
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          <CheckCircle2 className="w-3.5 h-3.5" />
          Complete Maintenance
        </button>
      </div>
    </div>
  );
}

// Maintenance History Item

function MaintenanceHistoryItem({ entry, asset, expanded, onToggle }: {
  entry: MaintenanceEntry;
  asset: Asset;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isReplace = entry.maintenanceType === "Replace";
  const sevEn = severityToEn(entry.severity);

  const issueText = isReplace
    ? `Replaced → ${entry.namaAsetBaru ?? (entry.idAsetBaru != null ? String(entry.idAsetBaru) : "—")}`
    : (entry.jenisKerusakan ?? "No Issue");
  const issueColor = isReplace
    ? "text-indigo-600"
    : entry.jenisKerusakan
    ? "text-red-500"
    : "text-zinc-500";

  return (
    <div>
      <button onClick={onToggle}
        className="w-full text-left py-3 border-b border-zinc-100 hover:bg-zinc-50/60 transition-colors duration-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-800">{fmtLogDate(entry.tanggalPengerjaan)}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{entry.maintenanceType} · {fmtCost(entry.biaya)}</p>
          </div>
          <p className={`text-[11px] font-medium ${issueColor} text-right leading-tight shrink-0 max-w-[45%]`}>
            {issueText}
          </p>
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      >
        <div className="overflow-hidden">
          <div className="my-2 p-3 rounded-xl border border-zinc-100 bg-zinc-50/60 space-y-3">
          {isReplace ? (
            <>
              {sevEn && (
                <div className={`flex items-center justify-center rounded-lg py-1.5 text-xs font-semibold ${SEVERITY_BADGE[sevEn] ?? "bg-zinc-200 text-zinc-700"}`}>
                  {sevEn} Damage
                </div>
              )}
              <div className="flex items-stretch gap-2">
                <div className="flex-1 rounded-lg bg-zinc-800 text-white p-2.5">
                  <p className="text-[11px] font-semibold">{entry.namaAsetLama ?? asset.nama ?? "—"}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{[asset.merek, asset.model].filter(Boolean).join(" ") || "—"}</p>
                </div>
                <div className="flex items-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-2.5">
                  <p className="text-[10px] text-indigo-500 font-medium mb-0.5">New Asset</p>
                  <p className="text-[11px] font-semibold text-zinc-800">
                    {entry.namaAsetBaru ?? (entry.idAsetBaru != null ? String(entry.idAsetBaru) : "—")}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {[entry.merekAsetBaru, entry.modelAsetBaru].filter(Boolean).join(" ") || "—"}
                  </p>
                </div>
              </div>
              {entry.alasanPenggantian && (
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">Cause of Replacement</p>
                  <p className="text-xs text-zinc-700">{entry.alasanPenggantian}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {(entry.tanggalPengerjaan || entry.tanggalSelesai) && (
                <div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <div className="flex-1 h-px bg-zinc-200 mx-0" />
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  </div>
                  <div className="flex justify-between mt-1">
                    <div>
                      <p className="text-[10px] text-zinc-500">Start</p>
                      <p className="text-[10px] font-medium text-zinc-700">{fmtLogDate(entry.tanggalPengerjaan)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500">Done</p>
                      <p className="text-[10px] font-medium text-zinc-700">{fmtLogDate(entry.tanggalSelesai)}</p>
                    </div>
                  </div>
                </div>
              )}
              {sevEn && (
                <div className={`flex items-center justify-center rounded-lg py-1.5 text-xs font-semibold ${SEVERITY_BADGE[sevEn] ?? "bg-zinc-200 text-zinc-700"}`}>
                  {sevEn} Damage
                </div>
              )}
              {(entry.jenisKerusakan || entry.penyebab) && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">What&apos;s Fixed</p>
                    <p className="text-xs text-zinc-700">{entry.jenisKerusakan ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">Cause</p>
                    <p className="text-xs text-zinc-700">{entry.penyebab ?? "—"}</p>
                  </div>
                </div>
              )}
              {entry.sparePartDigunakan && (
                <div className="flex items-start gap-2">
                  <Wrench className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-zinc-600">{entry.sparePartDigunakan}</p>
                </div>
              )}
              {entry.teknisiPelaksana && (
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-zinc-600">{entry.teknisiPelaksana}</p>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

// Maintenance History List                                                  

function MaintenanceHistoryList({ entries, loading, asset, expandedLogId, onExpand, typeFilter, onTypeFilterChange }: {
  entries: MaintenanceEntry[];
  loading: boolean;
  asset: Asset;
  expandedLogId: number | null;
  onExpand: (id: number | null) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
}) {
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const filtered = typeFilter ? entries.filter(e => e.maintenanceType === typeFilter) : entries;
  const sorted = [...filtered].sort((a, b) => {
    const ta = a.tanggalPengerjaan ? new Date(a.tanggalPengerjaan).getTime() : null;
    const tb = b.tanggalPengerjaan ? new Date(b.tanggalPengerjaan).getTime() : null;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return sortDir === "desc" ? tb - ta : ta - tb;
  });

  if (loading) {
    return (
      <div className="animate-pulse motion-reduce:animate-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-3 border-b border-zinc-100 flex items-start justify-between">
            <div>
              <div className="h-3 w-28 rounded bg-zinc-200" />
              <div className="h-2.5 w-20 rounded bg-zinc-100 mt-1.5" />
            </div>
            <div className="h-2.5 w-16 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="relative">
          <select value={typeFilter} onChange={e => onTypeFilterChange(e.target.value)}
            className="appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-7 py-1.5 text-xs text-zinc-600 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow]">
            <option value="">Maintenance Type</option>
            <option value="Repair">Repair</option>
            <option value="Replace">Replace</option>
            <option value="Preventive">Preventive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
        </div>
        <div className="flex items-center gap-2">
          {typeFilter && (
            <button onClick={() => onTypeFilterChange("")} className="text-[11px] text-indigo-600 hover:underline">
              Clear All
            </button>
          )}
          <button onClick={() => setSortDir(d => (d === "desc" ? "asc" : "desc"))}
            title={sortDir === "desc" ? "Newest first" : "Oldest first"}
            aria-label="Toggle sort order by date"
            className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] text-zinc-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 transition-[background-color,border-color,color,transform] duration-150">
            <ArrowDownUp className="w-3.5 h-3.5" />
            {sortDir === "desc" ? "Newest" : "Oldest"}
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="py-10 text-center text-xs text-zinc-500">
          {typeFilter ? "No records for this type." : "No maintenance history found."}
        </p>
      ) : (
        sorted.map(e => (
          <MaintenanceHistoryItem
            key={`${e.source}-${e.id}`}
            entry={e}
            asset={asset}
            expanded={expandedLogId === e.id && e.source === "komplain" || expandedLogId === -e.id && e.source === "penggantian"}
            onToggle={() => {
              const key = e.source === "komplain" ? e.id : -e.id;
              onExpand(expandedLogId === key ? null : key);
            }}
          />
        ))
      )}
    </div>
  );
}

// Searchable Combobox Filter                                                

function FilterCombobox({ value, onChange, options, placeholder, disabled = false, block = false }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
  disabled?: boolean; block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dropVis, setDropVis] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateRect = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom + 4, width: r.width });
  }, []);

  // Close on outside click — ignore clicks inside the portaled dropdown
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false); setQuery("");
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Keep the fixed dropdown anchored to the input while open
  useEffect(() => {
    if (!open) return;
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open, updateRect]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDropVis(open));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const filtered = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;
  const listId = `cb-${placeholder.replace(/\s+/g, "-").toLowerCase()}`;

  function pick(v: string) { onChange(v); setOpen(false); setQuery(""); }
  function clear(e: React.MouseEvent) { e.stopPropagation(); onChange(""); setOpen(false); setQuery(""); }

  return (
    <div ref={containerRef} className={`relative ${block ? "w-full" : ""}`}>
      <div className={`flex items-center rounded-lg border shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ${
        disabled ? "border-zinc-200 bg-zinc-50 cursor-not-allowed" : open ? "border-indigo-300 ring-2 ring-indigo-100 bg-white" : value ? "border-indigo-200 bg-indigo-50/50" : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}>
        <input type="text" value={open ? query : value} placeholder={placeholder} disabled={disabled}
          role="combobox" aria-expanded={open} aria-controls={listId} aria-label={placeholder} aria-autocomplete="list"
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={`min-w-0 bg-transparent pl-3 py-2 text-xs focus:outline-none placeholder:text-zinc-500 disabled:text-zinc-400 disabled:cursor-not-allowed ${block ? "flex-1" : "w-28"} ${value && !open ? "text-indigo-600 font-medium" : "text-zinc-700"}`} />
        {value && !open && !disabled
          ? <button onClick={clear} aria-label={`Clear ${placeholder}`} className="px-2 text-zinc-500 hover:text-zinc-600 transition-colors"><X className="w-3 h-3" /></button>
          : <ChevronDown className={`mr-2 w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        }
      </div>
      {open && rect && createPortal(
        <div ref={dropdownRef} id={listId} role="listbox"
          style={{ position: "fixed", left: rect.left, top: rect.top, minWidth: rect.width, transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
          className={`z-[100] w-max ${block ? "max-w-[20rem]" : "max-w-56"} rounded-xl border border-zinc-100 bg-white shadow-lg origin-top transition-[opacity,transform] duration-150 ${dropVis ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0
              ? <p className="px-3 py-2.5 text-xs text-zinc-500 italic">No matches</p>
              : filtered.map(o => (
                <button key={o} role="option" aria-selected={value === o} onMouseDown={e => e.preventDefault()} onClick={() => pick(o)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors duration-100 ${value === o ? "bg-indigo-50 text-indigo-600 font-medium" : "text-zinc-600 hover:bg-zinc-50"}`}>
                  {o}
                </button>
              ))
            }
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// Toast Notification

interface Toast { id: number; type: "success" | "error"; message: string; }

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [vis, setVis] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const enter = requestAnimationFrame(() => setVis(true));
    const timer = setTimeout(() => setLeaving(true), 3800);
    return () => { cancelAnimationFrame(enter); clearTimeout(timer); };
  }, []);
  const success = toast.type === "success";
  return (
    <div role="status" aria-live="polite"
      onTransitionEnd={() => { if (leaving) onDismiss(); }}
      style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      className={`pointer-events-auto flex items-start gap-2.5 w-72 rounded-xl border bg-white px-3.5 py-2.5 shadow-lg transition-[transform,opacity] duration-300 motion-reduce:transition-opacity ${
        vis && !leaving ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
      } ${success ? "border-green-200" : "border-red-200"}`}>
      {success
        ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
        : <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
      <p className="flex-1 text-xs text-zinc-700">{toast.message}</p>
      <button onClick={() => setLeaving(true)} aria-label="Dismiss notification"
        className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// Main Page

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [severityCounts, setSeverityCounts] = useState({ all: 0, Fatal: 0, AtRisk: 0, Healthy: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({ kategori: [], tipe: [], subKategori: [], lokasi: [], jadwal: [] });
  const [selectedKategori, setSelectedKategori] = useState("");
  const [selectedTipe, setSelectedTipe] = useState("");
  const [selectedLokasi, setSelectedLokasi] = useState("");
  const [selectedJadwal, setSelectedJadwal] = useState("");
  const [selectedKekritisan, setSelectedKekritisan] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predMsg, setPredMsg] = useState<string | null>(null);
  const [lastPredictedAt, setLastPredictedAt] = useState<string | null>(null);
  const [modalAsset, setModalAsset] = useState<Asset | null>(null);
  const [komplainLogs, setKomplainLogs] = useState<KomplainLog[]>([]);
  const [replaceLogs, setReplaceLogs] = useState<ReplaceLog[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("All Assets");
  const [activeStatus, setActiveStatus] = useState<"Active" | "Inactive">("Active");
  const [searchInput, setSearchInput] = useState(() =>
    typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("search") ?? "") : ""
  );
  const [search, setSearch] = useState(() =>
    typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("search") ?? "") : ""
  );

  // Under Maintenance tab
  const [mainView, setMainView] = useState<"assets" | "under-maintenance">("assets");
  const [underMaintenanceAssets, setUnderMaintenanceAssets] = useState<UnderMaintenanceAsset[]>([]);
  const [underMaintenanceLoading, setUnderMaintenanceLoading] = useState(false);
  const [underMaintenanceCount, setUnderMaintenanceCount] = useState(0);

  // Panel state
  const [panelView, setPanelView] = useState<PanelView>("overview");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [maintenanceTypeFilter, setMaintenanceTypeFilter] = useState("");
  const [addMaintenanceInitialType, setAddMaintenanceInitialType] = useState<"repair" | "replace">("repair");

  // Unsaved-changes guard for the add-maintenance and edit-asset forms
  const [maintenanceDirty, setMaintenanceDirty] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);

  // Toast notifications (top-right)
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const pushToast = useCallback((type: Toast["type"], message: string) => {
    setToasts(t => [...t, { id: ++toastSeq.current, type, message }]);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  // Animation refs
  const riskTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [riskIndicator, setRiskIndicator] = useState({ left: 0, width: 0, ready: false });
  const statusBtnRefs = useRef<Record<"Active" | "Inactive", HTMLButtonElement | null>>({ Active: null, Inactive: null });
  const [statusPill, setStatusPill] = useState<{ left: number; width: number; ready: boolean; animate: boolean }>({ left: 0, width: 0, ready: false, animate: false });
  const panelTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [panelIndicator, setPanelIndicator] = useState({ left: 0, width: 0, ready: false });
  const [panelVis, setPanelVis] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panelContentVis, setPanelContentVis] = useState(true);
  const panelContentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const LIMIT = 50;

  useEffect(() => {
    fetch("/api/assets/filters")
      .then(r => r.json())
      .then(data => setFilters({
        kategori: Array.isArray(data.kategori) ? data.kategori : [],
        tipe: Array.isArray(data.tipe) ? data.tipe : [],
        subKategori: Array.isArray(data.subKategori) ? data.subKategori : [],
        lokasi: Array.isArray(data.lokasi) ? data.lokasi : [],
        jadwal: Array.isArray(data.jadwal) ? data.jadwal : [],
      }))
      .catch(err => console.error("Failed to load filters:", err));
  }, []);

  // Sync search from URL on mount (handles SSR hydration where useState initializer can't read window)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("search");
    if (p) { setSearchInput(p); setSearch(p); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildParams = useCallback(
    () => new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      status: activeStatus === "Inactive" ? "inactive" : "Aktif",
      ...(selectedKategori && { kategori: selectedKategori }),
      ...(selectedTipe && { tipe: selectedTipe }),
      ...(selectedLokasi && { lokasi: selectedLokasi }),
      ...(selectedJadwal && { jadwal: FREQ_TO_JADWAL[selectedJadwal] ?? selectedJadwal }),
      ...(selectedKekritisan && { kekritisan: selectedKekritisan }),
      ...(search && { search }),
      sort: sortDir === "asc" ? "selesai_asc" : "selesai_desc",
      ...(activeStatus === "Active" && severityFilter !== "All Assets" && {
        severity: severityFilter === "At Risk" ? "AtRisk" : severityFilter,
      }),
    }),
    [page, selectedKategori, selectedTipe, selectedLokasi, selectedJadwal, selectedKekritisan, sortDir, search, severityFilter, activeStatus],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/assets?${buildParams()}`);
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const json = await res.json();
        if (!cancelled) { setAssets(json.data ?? []); setTotal(json.total ?? 0); }
      } catch (err) {
        if (!cancelled) { setAssets([]); setTotal(0); setLoadError(err instanceof Error ? err.message : "Failed to load assets"); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [buildParams]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/assets?${buildParams()}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = await res.json();
      setAssets(json.data ?? []); setTotal(json.total ?? 0);
    } catch (err) {
      setAssets([]); setTotal(0);
      setLoadError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Per-risk-level counts (ignores the active risk tab so each tab shows its own total)
  const buildCountParams = useCallback(
    () => new URLSearchParams({
      status: activeStatus === "Inactive" ? "inactive" : "Aktif",
      ...(selectedKategori && { kategori: selectedKategori }),
      ...(selectedTipe && { tipe: selectedTipe }),
      ...(selectedLokasi && { lokasi: selectedLokasi }),
      ...(selectedJadwal && { jadwal: FREQ_TO_JADWAL[selectedJadwal] ?? selectedJadwal }),
      ...(selectedKekritisan && { kekritisan: selectedKekritisan }),
      ...(search && { search }),
    }),
    [selectedKategori, selectedTipe, selectedLokasi, selectedJadwal, selectedKekritisan, search, activeStatus],
  );

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/counts?${buildCountParams()}`);
      const json = await res.json();
      setSeverityCounts(json);
    } catch {
      /* counts are non-critical */
    }
  }, [buildCountParams]);

  const fetchUnderMaintenance = useCallback(async () => {
    setUnderMaintenanceLoading(true);
    try {
      const res = await fetch("/api/assets/under-maintenance");
      const json = await res.json();
      setUnderMaintenanceAssets(json.data ?? []);
      setUnderMaintenanceCount(json.total ?? 0);
    } catch {
      /* non-critical */
    } finally {
      setUnderMaintenanceLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/assets/counts?${buildCountParams()}`);
        const json = await res.json();
        if (!cancelled) setSeverityCounts(json);
      } catch {
        /* counts are non-critical */
      }
    })();
    return () => { cancelled = true; };
  }, [buildCountParams]);

  // Keep under-maintenance count badge fresh on every load + when user visits the tab
  useEffect(() => {
    fetchUnderMaintenance();
  }, [fetchUnderMaintenance]);

  useEffect(() => {
    if (mainView === "under-maintenance") fetchUnderMaintenance();
  }, [mainView, fetchUnderMaintenance]);

  // Severity tab indicator — re-measures on tab change, count change, and when the
  // Active/Inactive toggle collapses or expands the tab row.
  useEffect(() => {
    const idx = SEVERITY_TABS.indexOf(severityFilter);
    const el = riskTabRefs.current[idx];
    if (!el) return;
    setRiskIndicator({ left: el.offsetLeft + 12, width: el.offsetWidth - 24, ready: true });
  }, [severityFilter, severityCounts, activeStatus]);

  // Sliding pill for the Active/Inactive toggle (matches the Maintenance Type toggle)
  useEffect(() => {
    const btn = statusBtnRefs.current[activeStatus];
    if (!btn) return;
    setStatusPill(prev => ({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true, animate: prev.ready }));
  }, [activeStatus]);

  // Panel entry animation — exit is handled by closePanel
  useEffect(() => {
    if (!modalAsset) return;
    const id = requestAnimationFrame(() => { setPanelVis(true); panelRef.current?.focus(); });
    return () => cancelAnimationFrame(id);
  }, [modalAsset]);

  // Close the detail panel on Escape (guards unsaved edits)
  useEffect(() => {
    if (!modalAsset) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") guardedNav(closePanel);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalAsset, panelView, maintenanceDirty, editDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Panel tab sliding indicator
  useEffect(() => {
    const activeIdx = (panelView === "overview" || panelView === "edit") ? 0 : 1;
    const el = panelTabRefs.current[activeIdx];
    if (!el) return;
    setPanelIndicator({ left: el.offsetLeft + 8, width: el.offsetWidth - 16, ready: true });
  }, [panelView, modalAsset]);

  // When opening finish-maintenance directly from a card, switch to finish-maintenance view
  useEffect(() => {
    if (panelView === "finish-maintenance" && modalAsset?.status !== "Under Maintenance") {
      setPanelView("maintenance-history");
    }
  }, [panelView, modalAsset]);

  async function runPrediction() {
    setPredicting(true); setPredMsg(null);
    try {
      const res = await fetch("/api/assets/predict", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setPredMsg(`Prediction failed: ${json.message ?? "Server error"}${json.detail ? ` — ${json.detail}` : ""}`);
      } else {
        setLastPredictedAt(new Date().toLocaleString("en-US"));
        setPredMsg(`Prediction complete — ${json.total_diproses ?? 0} assets updated`);
        fetchAssets();
        fetchCounts();
      }
    } catch (err) {
      setPredMsg(`Prediction failed: ${String(err)}`);
    } finally {
      setPredicting(false);
    }
  }

  function mergeEntries(komplain: KomplainLog[], replace: ReplaceLog[]): MaintenanceEntry[] {
    const fromKomplain: MaintenanceEntry[] = komplain.map(k => ({
      id: k.id,
      source: "komplain" as const,
      maintenanceType: k.maintenanceType ?? "Repair",
      tanggalPengerjaan: k.tanggalPengerjaan,
      tanggalSelesai: k.tanggalSelesai,
      biaya: k.biayaPerbaikan,
      severity: k.severity,
      jenisKerusakan: k.jenisKerusakan,
      penyebab: k.penyebab,
      sparePartDigunakan: k.sparePartDigunakan,
      teknisiPelaksana: k.teknisiPelaksana,
    }));
    const fromReplace: MaintenanceEntry[] = replace.map(r => ({
      id: r.id,
      source: "penggantian" as const,
      maintenanceType: "Replace",
      tanggalPengerjaan: r.tanggalPenggantian,
      tanggalSelesai: null,
      biaya: r.biayaPenggantian,
      severity: null,
      idAsetBaru: r.idAsetBaru,
      namaAsetLama: r.namaAsetLama,
      namaAsetBaru: r.namaAsetBaru,
      merekAsetBaru: r.merekAsetBaru,
      modelAsetBaru: r.modelAsetBaru,
      alasanPenggantian: r.alasanPenggantian,
    }));
    return [...fromKomplain, ...fromReplace].sort((a, b) => {
      if (!a.tanggalPengerjaan) return 1;
      if (!b.tanggalPengerjaan) return -1;
      return new Date(b.tanggalPengerjaan).getTime() - new Date(a.tanggalPengerjaan).getTime();
    });
  }

  async function openModal(asset: Asset) {
    if (panelCloseTimer.current) { clearTimeout(panelCloseTimer.current); panelCloseTimer.current = null; }
    if (panelContentTimer.current) { clearTimeout(panelContentTimer.current); panelContentTimer.current = null; }
    setPanelContentVis(true);
    setModalAsset(asset);
    setPanelView("overview");
    setExpandedLogId(null);
    setMaintenanceTypeFilter("");
    setKomplainLogs([]);
    setReplaceLogs([]);
    setModalLoading(true);
    try {
      const [resK, resR] = await Promise.all([
        fetch(`/api/assets/${encodeURIComponent(asset.idAset)}/komplain`),
        fetch(`/api/assets/${encodeURIComponent(asset.idAset)}/replace`),
      ]);
      const [jsonK, jsonR] = await Promise.all([resK.json(), resR.json()]);
      setKomplainLogs(jsonK.data ?? []);
      setReplaceLogs(jsonR.data ?? []);
    } finally {
      setModalLoading(false);
    }
  }

  function closePanel() {
    if (panelCloseTimer.current) clearTimeout(panelCloseTimer.current);
    setPanelVis(false);
    panelCloseTimer.current = setTimeout(() => {
      setModalAsset(null);
      setPanelView("overview");
      setPanelIndicator({ left: 0, width: 0, ready: false });
      panelCloseTimer.current = null;
    }, 320);
  }

  function animateToPanelView(view: PanelView) {
    if (panelContentTimer.current) clearTimeout(panelContentTimer.current);
    setPanelContentVis(false);
    panelContentTimer.current = setTimeout(() => {
      setPanelView(view);
      setPanelContentVis(true);
      panelContentTimer.current = null;
    }, 100);
  }

  // Run `action` immediately, or defer it behind the unsaved-changes warning when
  // the add-maintenance or edit-asset form has dirty input.
  function guardedNav(action: () => void) {
    const hasUnsaved =
      (panelView === "add-maintenance" && maintenanceDirty) ||
      (panelView === "edit" && editDirty);
    if (hasUnsaved) {
      setPendingNav(() => action);
    } else {
      action();
    }
  }

  function goToAddMaintenance(type: "repair" | "replace") {
    setAddMaintenanceInitialType(type);
    setPanelView("add-maintenance");
  }

  function handleEditSave(updated: Partial<Asset>) {
    setModalAsset(prev => prev ? { ...prev, ...updated } : null);
    setEditDirty(false);
    setPanelView("overview");
    fetchAssets();
    pushToast("success", "Asset changes saved");
  }

  function handleEditDelete() {
    setEditDirty(false);
    closePanel();
    fetchAssets();
    fetchCounts();
    pushToast("success", "Asset deleted");
  }

  async function handleMaintenanceSave(result?: { newIdAset?: number; newNama?: string }) {
    if (!modalAsset) return;
    const effectiveId = result?.newIdAset ?? modalAsset.idAset;
    if (result?.newIdAset) {
      setModalAsset(prev => prev ? { ...prev, idAset: result.newIdAset!, nama: result.newNama ?? prev.nama } : null);
    }
    setModalLoading(true);
    try {
      const [resK, resR] = await Promise.all([
        fetch(`/api/assets/${encodeURIComponent(effectiveId)}/komplain`),
        fetch(`/api/assets/${encodeURIComponent(effectiveId)}/replace`),
      ]);
      const [jsonK, jsonR] = await Promise.all([resK.json(), resR.json()]);
      setKomplainLogs(jsonK.data ?? []);
      setReplaceLogs(jsonR.data ?? []);
    } finally {
      setModalLoading(false);
    }
    setMaintenanceDirty(false);
    setPanelView("maintenance-history");
    fetchAssets();
    fetchCounts();
    fetchUnderMaintenance();
    pushToast("success", "Maintenance log saved");
  }

  async function handleFinishSave() {
    if (!modalAsset) return;
    setModalAsset(prev => prev ? { ...prev, status: "Aktif" } : null);
    setModalLoading(true);
    try {
      const [resK, resR] = await Promise.all([
        fetch(`/api/assets/${encodeURIComponent(modalAsset.idAset)}/komplain`),
        fetch(`/api/assets/${encodeURIComponent(modalAsset.idAset)}/replace`),
      ]);
      const [jsonK, jsonR] = await Promise.all([resK.json(), resR.json()]);
      setKomplainLogs(jsonK.data ?? []);
      setReplaceLogs(jsonR.data ?? []);
    } finally {
      setModalLoading(false);
    }
    setPanelView("maintenance-history");
    fetchAssets();
    fetchCounts();
    fetchUnderMaintenance();
    pushToast("success", "Maintenance completed!");
  }

  const handleFilterChange = (type: "kategori" | "tipe" | "lokasi" | "jadwal" | "kekritisan", value: string) => {
    if (type === "kategori") setSelectedKategori(value);
    else if (type === "tipe") setSelectedTipe(value);
    else if (type === "lokasi") setSelectedLokasi(value);
    else if (type === "jadwal") setSelectedJadwal(value);
    else if (type === "kekritisan") setSelectedKekritisan(value);
    setPage(1);
  };

  const hasActiveFilters = selectedKategori !== "" || selectedTipe !== "" || selectedLokasi !== "" || selectedJadwal !== "" || selectedKekritisan !== "" || search !== "" || severityFilter !== "All Assets";

  function resetFilters() {
    setSelectedKategori(""); setSelectedTipe(""); setSelectedLokasi(""); setSelectedJadwal(""); setSelectedKekritisan("");
    setSearchInput(""); setSearch(""); setSeverityFilter("All Assets"); setPage(1);
  }

  const totalPages = Math.ceil(total / LIMIT);
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
    <div className="-m-4 md:-m-8 flex overflow-hidden" style={{ height: "calc(100svh - 5rem - 2rem)" }}>

      {/*    Left: Table    */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 p-4 md:p-6">

        {/* Severity tabs + Active/Inactive toggle */}
        <div className="relative flex items-end gap-0 border-b border-zinc-100 mb-4 shrink-0">
          {SEVERITY_TABS.map((tab, i) => {
            const isAllAssets = tab === "All Assets";
            const countKey = tab === "At Risk" ? "AtRisk" : tab;
            const tabCount = isAllAssets ? severityCounts.all : severityCounts[countKey as keyof typeof severityCounts] ?? 0;
            const isActive = severityFilter === tab;
            const hideTab = !isAllAssets && activeStatus === "Inactive";
            return (
              <div
                key={tab}
                className={`grid transition-[grid-template-columns,opacity] duration-420 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${hideTab ? "grid-cols-[0fr] opacity-0 pointer-events-none" : "grid-cols-[1fr] opacity-100"}`}
              >
                <div className="overflow-hidden min-w-0">
                  <button
                    ref={el => { riskTabRefs.current[i] = el; }}
                    onClick={() => { setSeverityFilter(tab); setPage(1); setMainView("assets"); }}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap ${isActive ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-600"}`}
                  >
                    {tab}
                    {isActive && <TabCountBadge count={tabCount} />}
                  </button>
                </div>
              </div>
            );
          })}
          {riskIndicator.ready && mainView === "assets" && (
            <span className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-indigo-600 rounded-full transition-[transform,width] duration-300"
              style={{ transform: `translateX(${riskIndicator.left}px)`, width: `${riskIndicator.width}px`, transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }} />
          )}

          {/* Under Maintenance tab */}
          <button
            onClick={() => setMainView(v => v === "under-maintenance" ? "assets" : "under-maintenance")}
            className={`relative ml-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap flex items-center gap-1.5 ${
              mainView === "under-maintenance" ? "text-amber-600" : "text-zinc-500 hover:text-zinc-600"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Under Maintenance
            <span className={`ml-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              mainView === "under-maintenance" ? "bg-amber-100 text-amber-600" : "bg-zinc-100 text-zinc-500"
            }`}>
              {underMaintenanceCount}
            </span>
            {mainView === "under-maintenance" && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>

          {/* Active / Inactive toggle — sliding pill (same as the Maintenance Type toggle) */}
          <div className="ml-auto mb-1 relative inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-0.5">
            {statusPill.ready && (
              <span
                className="absolute inset-y-0.5 rounded-full bg-white shadow-sm pointer-events-none"
                style={{
                  left: `${statusPill.left}px`,
                  width: `${statusPill.width}px`,
                  ...(statusPill.animate && { transition: "left 200ms cubic-bezier(0.23, 1, 0.32, 1), width 200ms cubic-bezier(0.23, 1, 0.32, 1)" }),
                }}
              />
            )}
            {(["Active", "Inactive"] as const).map(s => (
              <button
                key={s}
                ref={el => { statusBtnRefs.current[s] = el; }}
                onClick={() => {
                  setActiveStatus(s);
                  setSeverityFilter("All Assets");
                  setPage(1);
                  setMainView("assets");
                }}
                className={`relative z-10 px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                  activeStatus === s ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Under Maintenance card grid */}
        {mainView === "under-maintenance" && (
          <div className="flex-1 overflow-y-auto">
            {underMaintenanceLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-zinc-100 bg-white p-5 space-y-3">
                    <div className="h-3 w-32 rounded bg-zinc-200" />
                    <div className="h-2.5 w-24 rounded bg-zinc-100" />
                    <div className="h-px bg-zinc-100" />
                    <div className="h-2.5 w-20 rounded bg-zinc-100" />
                    <div className="h-2.5 w-28 rounded bg-zinc-100" />
                    <div className="flex gap-2 pt-2">
                      <div className="flex-1 h-8 rounded-lg bg-zinc-100" />
                      <div className="flex-1 h-8 rounded-lg bg-zinc-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : underMaintenanceAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <Wrench className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-zinc-600">No assets under maintenance</p>
                <p className="text-xs text-zinc-400 mt-1">When you start a maintenance ticket, assets will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-1">
                {underMaintenanceAssets.map(a => (
                  <div key={a.idAset}
                    className="rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
                    {/* Card accent bar */}
                    <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-300 shrink-0" />
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-zinc-900 truncate">{a.nama ?? `Asset #${a.idAset}`}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                            {[a.tipe, a.kategori].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                        {a.kekritisan && (
                          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            a.kekritisan === "Critical" ? "bg-red-50 text-red-600 border-red-200"
                            : a.kekritisan === "Major" ? "bg-orange-50 text-orange-600 border-orange-200"
                            : "bg-yellow-50 text-yellow-600 border-yellow-200"
                          }`}>
                            {a.kekritisan}
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span className="truncate">
                          {[a.lokasiGedung, a.lokasiLantai, a.lokasiZona].filter(Boolean).join(", ") || "—"}
                        </span>
                      </div>

                      <div className="border-t border-zinc-100" />

                      {/* Ticket dates */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <p className="text-zinc-400 mb-0.5">Execution Date</p>
                          <p className="font-medium text-zinc-700">
                            {a.tanggalPengerjaan
                              ? new Date(a.tanggalPengerjaan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"}
                          </p>
                        </div>
                        {a.tanggalPerencanaan && (
                          <div>
                            <p className="text-zinc-400 mb-0.5">Planned</p>
                            <p className="font-medium text-zinc-700">
                              {new Date(a.tanggalPerencanaan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Status pill */}
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                          Under Maintenance
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto pt-1">
                        <button
                          onClick={() => {
                            const asset = {
                              id: a.id, idAset: a.idAset, nama: a.nama,
                              merek: null, model: null, kategori: a.kategori,
                              subKategori: null, tipe: a.tipe,
                              tglInstalasi: null, lokasiGedung: a.lokasiGedung,
                              lokasiLantai: a.lokasiLantai, lokasiZona: a.lokasiZona,
                              kekritisan: a.kekritisan, status: "Under Maintenance",
                              statusJadwal: null, confidence: null, latestSeverity: null,
                            } satisfies Asset;
                            openModal(asset);
                          }}
                          className="flex-1 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            const asset = {
                              id: a.id, idAset: a.idAset, nama: a.nama,
                              merek: null, model: null, kategori: a.kategori,
                              subKategori: null, tipe: a.tipe,
                              tglInstalasi: null, lokasiGedung: a.lokasiGedung,
                              lokasiLantai: a.lokasiLantai, lokasiZona: a.lokasiZona,
                              kekritisan: a.kekritisan, status: "Under Maintenance",
                              statusJadwal: null, confidence: null, latestSeverity: null,
                            } satisfies Asset;
                            openModal(asset).then(() => animateToPanelView("finish-maintenance"));
                          }}
                          className="flex-1 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Finish
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters + Table — hidden when Under Maintenance tab is active */}
        {mainView === "assets" && <>
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search..." aria-label="Search assets by name, type, or ID"
              className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-700 shadow-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-[border-color,box-shadow]" />
          </div>
          <FilterCombobox value={selectedTipe} onChange={v => handleFilterChange("tipe", v)} options={filters.tipe} placeholder="Asset Type" />
          <FilterCombobox value={selectedKategori} onChange={v => handleFilterChange("kategori", v)} options={filters.kategori} placeholder="Category" />
          <FilterCombobox value={selectedLokasi} onChange={v => handleFilterChange("lokasi", v)} options={filters.lokasi} placeholder="Location" />
          <FilterCombobox value={selectedKekritisan} onChange={v => handleFilterChange("kekritisan", v)} options={PRIORITY_OPTIONS} placeholder="Priority" />
          <FilterCombobox value={selectedJadwal} onChange={v => handleFilterChange("jadwal", v)} options={FREQ_OPTIONS} placeholder="Frequency" />
          <button onClick={() => { setSortDir(d => (d === "desc" ? "asc" : "desc")); setPage(1); }}
            title={sortDir === "desc" ? "Latest maintenance first (newest to oldest)" : "Oldest maintenance first (oldest to newest)"}
            aria-label="Toggle sort by maintenance completion date"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 transition-[background-color,border-color,color,transform] duration-150">
            <ArrowDownUp className="w-3.5 h-3.5" />
            {sortDir === "desc" ? "Newest" : "Oldest"}
          </button>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 active:scale-95 transition-[background-color,border-color,color,transform] duration-150">
              <X className="w-3 h-3" /> Reset
            </button>
          )}
          <button onClick={runPrediction} disabled={predicting} title="Run AI Prediction"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 disabled:opacity-50 transition-[background-color,border-color,color,transform] duration-150">
            {predicting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {predicting ? "Running…" : "Predict"}
          </button>
        </div>

        {predMsg && (
          <div className={`mb-3 shrink-0 flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${predMsg.includes("complete") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
            <span>{predMsg}</span>
            <button onClick={() => setPredMsg(null)} aria-label="Dismiss message" className="ml-2 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Asset</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Category</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Current Life</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Location</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Priority</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Health Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse motion-reduce:animate-none">
                      <td className="px-4 py-3">
                        <div className="h-3 w-24 rounded bg-zinc-200" />
                        <div className="h-2.5 w-16 rounded bg-zinc-100 mt-1.5" />
                      </td>
                      <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-zinc-200" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-24 rounded bg-zinc-200" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-28 rounded bg-zinc-200" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-zinc-200" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-zinc-200" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-14 rounded bg-zinc-200" /></td>
                    </tr>
                  ))
                ) : loadError ? (
                  <tr><td colSpan={7} className="py-16 text-center">
                    <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-zinc-700">Couldn&apos;t load assets</p>
                    <p className="text-xs text-zinc-500 mt-1">{loadError}</p>
                    <button onClick={fetchAssets}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-[background-color,transform] duration-150">
                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                  </td></tr>
                ) : assets.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center">
                    <Search className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-zinc-600">No assets found</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {hasActiveFilters ? "Try adjusting or clearing your filters." : "There are no assets to show yet."}
                    </p>
                    {hasActiveFilters && (
                      <button onClick={resetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-[background-color,transform] duration-150">
                        <X className="w-3.5 h-3.5" /> Reset filters
                      </button>
                    )}
                  </td></tr>
                ) : (
                  assets.map(a => {
                    const selected = modalAsset?.id === a.id;
                    const healthStatus = getHealthStatusDisplay(a.latestSeverity ?? null);
                    return (
                      <tr key={a.id} onClick={() => guardedNav(() => openModal(a))}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open details for ${a.nama ?? a.idAset}`}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); guardedNav(() => openModal(a)); } }}
                        className={`group cursor-pointer transition-colors duration-100 outline-none ${selected ? "bg-indigo-50" : "hover:bg-indigo-50/50 focus-visible:bg-indigo-50"}`}>
                        <td className={`px-4 py-3 transition-shadow duration-100 ${selected ? "shadow-[inset_3px_0_0_0_#6366f1]" : "group-focus-visible:shadow-[inset_3px_0_0_0_#818cf8]"}`}>
                          <p className="text-xs font-semibold text-indigo-600">{a.nama ?? String(a.idAset)}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{a.tipe ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-600">{a.kategori ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {currentLife(a.tglInstalasi)}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {[a.lokasiGedung, a.lokasiLantai, a.lokasiZona].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${a.kekritisan ? RISK_COLORS[a.kekritisan] : "bg-zinc-100 text-zinc-500 border border-zinc-200"}`}>
                            {a.kekritisan ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {a.status === "Under Maintenance" ? (
                            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                              Under Maintenance
                            </span>
                          ) : (
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${healthStatus.css}`}>{healthStatus.label}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-zinc-700">{freqLabel(a.statusJadwal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="shrink-0 flex items-center justify-between border-t border-zinc-100 px-4 py-3 bg-white">
            <span className="text-xs text-zinc-500">Showing {showingFrom} to {showingTo} of {total.toLocaleString()} assets</span>
            <div className="flex items-center gap-3">
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"
                    className="flex items-center justify-center w-9 h-9 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-zinc-500" />
                  </button>
                  {pageNums.map((n, i) => n === "…"
                    ? <span key={`e${i}`} className="px-1 text-xs text-zinc-500">…</span>
                    : <button key={n} onClick={() => setPage(n as number)}
                        aria-label={`Go to page ${n}`} aria-current={page === n ? "page" : undefined}
                        className={`w-9 h-9 rounded text-xs font-medium transition-[background-color,color] duration-150 ${page === n ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-100"}`}>
                        {n}
                      </button>
                  )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page"
                    className="flex items-center justify-center w-9 h-9 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              )}
              <button onClick={() => router.push("/update_assets")}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-[background-color,box-shadow,transform] duration-150">
                <Plus className="w-3.5 h-3.5" /> Add Asset(s)
              </button>
            </div>
          </div>
        </div>

        {lastPredictedAt && (
          <p className="mt-2 text-[10px] text-zinc-500 shrink-0">Prediction last run: {lastPredictedAt}</p>
        )}
        </>}
      </div>

      {/*    Right: Detail Panel    */}
      {modalAsset && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-label={`Details for ${modalAsset.nama ?? modalAsset.idAset}`}
          className={`fixed inset-0 z-50 md:static md:inset-auto md:z-auto md:shrink-0 md:overflow-hidden focus:outline-none md:transition-[width] md:duration-300 md:motion-reduce:transition-none ${
            panelVis ? "md:w-80 xl:w-96" : "md:w-0"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
        >
          <div
            className={`h-full w-full md:w-80 xl:w-96 flex flex-col bg-white border-l border-zinc-100 overflow-hidden transition-[transform,opacity] duration-300 motion-reduce:transition-opacity md:translate-x-0 md:opacity-100 ${
              panelVis ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            }`}
            style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
          >
          {/* Header */}
          <div className="relative overflow-hidden p-5 bg-gradient-to-br from-white to-indigo-50/30 shrink-0">
            <GeoDeco />
            <div className="relative z-10 flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs text-zinc-500 mb-0.5">{modalAsset.tipe ?? "Asset"}</p>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{modalAsset.nama ?? String(modalAsset.idAset)}</h2>
                  {panelView === "overview" && (
                    <button onClick={() => setPanelView("edit")} aria-label="Edit asset"
                      className="p-1 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-600 transition-[background-color,color] duration-150">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {[modalAsset.kategori, modalAsset.lokasiGedung].filter(Boolean).join(" · ") || "—"}
                </p>
                {modalAsset.status === "Under Maintenance" && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Under Maintenance
                  </span>
                )}
              </div>
              <button onClick={() => guardedNav(closePanel)} aria-label="Close panel"
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-600 active:scale-95 transition-[background-color,color,transform] duration-150 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="relative flex border-b border-zinc-100 px-4 shrink-0">
            <button ref={el => { panelTabRefs.current[0] = el; }}
              onClick={() => guardedNav(() => animateToPanelView("overview"))}
              className={`px-3 py-2.5 text-xs font-medium transition-colors duration-150 ${
                (panelView === "overview" || panelView === "edit") ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-600"
              }`}>
              Overview
            </button>
            <button ref={el => { panelTabRefs.current[1] = el; }}
              onClick={() => guardedNav(() => animateToPanelView("maintenance-history"))}
              className={`px-3 py-2.5 text-xs font-medium transition-colors duration-150 ${
                (panelView === "maintenance-history" || panelView === "add-maintenance" || panelView === "finish-maintenance") ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-600"
              }`}>
              {panelView === "add-maintenance" ? "Maintenance" : panelView === "finish-maintenance" ? "Finish Ticket" : "Maintenance History"}
            </button>
            {panelIndicator.ready && (
              <span className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-indigo-600 rounded-full transition-[transform,width] duration-200"
                style={{ transform: `translateX(${panelIndicator.left}px)`, width: `${panelIndicator.width}px`, transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }} />
            )}
          </div>

          {/* Content */}
          <div className={`flex-1 min-h-0 overflow-hidden transition-opacity duration-100 ${panelContentVis ? "opacity-100" : "opacity-0"}`}>
            {panelView === "overview" && (
              <div className="h-full overflow-y-auto p-4">
                <OverviewContent asset={modalAsset} logs={komplainLogs} loading={modalLoading} />
              </div>
            )}

            {panelView === "edit" && (
              <EditAssetForm
                asset={modalAsset}
                filters={filters}
                onSave={handleEditSave}
                onCancel={() => { setEditDirty(false); setPanelView("overview"); }}
                onDelete={handleEditDelete}
                onGoToReplace={() => goToAddMaintenance("replace")}
                onDirtyChange={setEditDirty}
                onToast={pushToast}
              />
            )}

            {panelView === "maintenance-history" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Under Maintenance status banner */}
                  {modalAsset.status === "Under Maintenance" && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <p className="text-[11px] text-amber-700 font-medium">Asset is currently under maintenance</p>
                    </div>
                  )}
                  <MaintenanceHistoryList
                    entries={mergeEntries(komplainLogs, replaceLogs)}
                    loading={modalLoading}
                    asset={modalAsset}
                    expandedLogId={expandedLogId}
                    onExpand={setExpandedLogId}
                    typeFilter={maintenanceTypeFilter}
                    onTypeFilterChange={setMaintenanceTypeFilter}
                  />
                </div>
                <div className="shrink-0 border-t border-zinc-100 px-4 py-3 bg-white">
                  {modalAsset.status === "Under Maintenance" ? (
                    <button onClick={() => animateToPanelView("finish-maintenance")}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-[background-color] duration-150 active:scale-[0.98]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Finish Maintenance
                    </button>
                  ) : (
                    <button onClick={() => goToAddMaintenance("repair")}
                      disabled={modalAsset.status === "Diganti" || modalAsset.status === "Dihapus"}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-[background-color] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-indigo-600">
                      <Plus className="w-3.5 h-3.5" /> Add Maintenance
                    </button>
                  )}
                </div>
              </div>
            )}

            {panelView === "add-maintenance" && (
              <AddMaintenanceForm
                asset={modalAsset}
                initialType={addMaintenanceInitialType}
                onSave={result => {
                  // If it was a start-maintenance (repair), update the modal asset status
                  if (!result?.newIdAset) {
                    setModalAsset(prev => prev ? { ...prev, status: "Under Maintenance" } : null);
                  }
                  handleMaintenanceSave(result);
                }}
                onCancel={() => { setMaintenanceDirty(false); setPanelView("maintenance-history"); }}
                onDirtyChange={setMaintenanceDirty}
                onToast={pushToast}
              />
            )}

            {panelView === "finish-maintenance" && (
              <FinishMaintenanceForm
                asset={modalAsset}
                onSave={handleFinishSave}
                onCancel={() => animateToPanelView("maintenance-history")}
                onToast={pushToast}
              />
            )}
          </div>
          </div>
        </div>
      )}

      {pendingNav && createPortal(
        <LeaveWarningModal
          onStay={() => setPendingNav(null)}
          onLeave={() => {
            const act = pendingNav;
            setPendingNav(null);
            setMaintenanceDirty(false);
            setEditDirty(false);
            act?.();
          }}
        />,
        document.body,
      )}

      {typeof document !== "undefined" && toasts.length > 0 && createPortal(
        <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
