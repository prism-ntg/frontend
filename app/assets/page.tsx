"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronDown, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, Plus, X, Pencil, AlertTriangle,
  ArrowRight, ArrowDown, Wrench, User, Filter,
} from "lucide-react";

// Types                                                                    

type PanelView = "overview" | "edit" | "maintenance-history" | "add-maintenance";

interface Asset {
  id: number;
  idAset: string;
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
}

interface KomplainLog {
  id: number;
  idAset: string;
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
  idAsetLama: string;
  idAsetBaru: string | null;
  merekBaru: string | null;
  modelBaru: string | null;
  tanggalPenggantian: string | null;
  alasanPenggantian: string | null;
  biayaPenggantian: number | null;
  severity: string | null;
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
  idAsetBaru?: string | null;
  merekBaru?: string | null;
  modelBaru?: string | null;
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
  idAsetBaru: string;
  merekBaru: string;
  modelBaru: string;
  alasanPenggantian: string;
  severity: string;
  biayaPenggantian: string;
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
  Harian: "Daily", Mingguan: "Weekly", Bulanan: "Monthly", Tahunan: "Yearly", Reaktif: "Reactive",
};

const FREQ_TO_JADWAL: Record<string, string> = {
  Daily: "Harian", Weekly: "Mingguan", Monthly: "Bulanan", Yearly: "Tahunan", Reactive: "Reaktif",
};

const FREQ_OPTIONS = ["Daily", "Weekly", "Monthly", "Yearly", "Reactive"];
const RISK_TABS = ["All", "Healthy", "Minor", "Major", "Critical"];

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
const STATUS_OPTIONS = ["Active", "Damaged", "Replaced"];
const STATUS_EN_TO_ID: Record<string, string> = {
  Active: "Aktif", Damaged: "Rusak", Replaced: "Diganti",
};
const STATUS_ID_TO_EN: Record<string, string> = {
  Aktif: "Active", Rusak: "Damaged", Diganti: "Replaced",
};

// Zone — kept in Indonesian for both display and storage
const ZONE_OPTIONS = ["Timur", "Barat", "Utara", "Selatan"];

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
  tanggalPengerjaan: "", idAsetBaru: "", merekBaru: "",
  modelBaru: "", alasanPenggantian: "", severity: "", biayaPenggantian: "",
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
  return parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
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
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-700 mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 active:scale-95 ${
              value === opt
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {opt}
          </button>
        ))}
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
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />)}
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5">
        {months.map((m) => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

// Incomplete Warning Modal                                                  

function IncompleteWarningModal({ onContinue, onLeave }: { onContinue: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4">
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
            className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Keep Editing
          </button>
        </div>
      </div>
    </div>
  );
}

// Leave (unsaved changes) Warning Modal                                     

function LeaveWarningModal({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4">
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
            className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Leave
          </button>
          <button
            onClick={onStay}
            className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Keep Editing
          </button>
        </div>
      </div>
    </div>
  );
}

// Overview Content                                                          

function OverviewContent({ asset, logs, loading }: { asset: Asset; logs: KomplainLog[]; loading: boolean }) {
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

      <div>
        <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
          <span>Poor</span><span>Excellent</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${healthBarColor(hs)}`}
            style={{ width: `${hs}%`, transition: "width 700ms cubic-bezier(0.23, 1, 0.32, 1)" }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
        <p className="text-[11px] text-zinc-400 mb-1">Maintenance Frequency</p>
        <div className="flex items-baseline justify-between">
          <p className="text-xl font-bold text-zinc-900">{freqLabel(asset.statusJadwal)}</p>
          <p className="text-[10px] text-zinc-400">
            {asset.statusJadwal ? `Last updated on ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}` : "—"}
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

      <div>
        <p className="text-xs font-medium text-zinc-600 mb-2">Health Score Overview</p>
        <HealthChart logs={logs} score={hs} />
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
              <span className="text-zinc-400">{label}</span>
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
  asset, filters, onSave, onCancel, onGoToReplace, onDirtyChange,
}: {
  asset: Asset;
  filters: Filters;
  onSave: (updated: Partial<Asset>) => void;
  onCancel: () => void;
  onGoToReplace: () => void;
  onDirtyChange?: (dirty: boolean) => void;
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
  };
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report dirty state up so the page can guard against navigating away with unsaved edits
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const requiredFilled = !!(
    form.nama.trim() && form.status && form.tipe && form.kategori &&
    form.subKategori && form.merek && form.model && form.tglInstalasi &&
    form.lokasiGedung && form.lokasiLantai && form.lokasiZona
  );

  async function handleSave() {
    if (!requiredFilled) return;
    setSaving(true);
    setError(null);
    try {
      const statusId = STATUS_EN_TO_ID[form.status] ?? form.status;
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
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to update");
      onSave({
        nama: form.nama || null, status: statusId,
        tipe: form.tipe || null, kategori: form.kategori || null,
        subKategori: form.subKategori || null, merek: form.merek || null,
        model: form.model || null, tglInstalasi: form.tglInstalasi || null,
        lokasiGedung: form.lokasiGedung || null, lokasiLantai: form.lokasiLantai || null,
        lokasiZona: zonaId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white";
  const selectCls = `${inputCls} appearance-none`;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 shrink-0">
        <p className="text-xs font-medium text-zinc-800">Edit Asset Information</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">
          Replaced this asset with a new one?{" "}
          <button onClick={onGoToReplace} className="text-indigo-600 hover:underline">
            Go to Add Maintenance
          </button>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3.5">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Asset Name*</label>
          <input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
            placeholder={asset.idAset} className={inputCls} />
        </div>

        <ToggleGroup label="Asset Status*" options={STATUS_OPTIONS}
          value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} />

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Asset Type*</label>
          <div className="relative">
            <select value={form.tipe} onChange={e => setForm(f => ({ ...f, tipe: e.target.value }))} className={selectCls}>
              <option value="">e.g. Air Conditioner</option>
              {filters.tipe.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Category*</label>
          <div className="relative">
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))} className={selectCls}>
              <option value="">Select Category</option>
              {filters.kategori.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Sub-category*</label>
          <input value={form.subKategori} onChange={e => setForm(f => ({ ...f, subKategori: e.target.value }))}
            placeholder="e.g. Control Panel" className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 mb-1 block">Manufacturer*</label>
          <input value={form.merek} onChange={e => setForm(f => ({ ...f, merek: e.target.value }))}
            placeholder="e.g. Mitsubishi Co. Ltd" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Asset Model*</label>
            <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              placeholder="e.g. MSY-GN-792" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Installation Date*</label>
            <input type="date" value={form.tglInstalasi}
              onChange={e => setForm(f => ({ ...f, tglInstalasi: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Building*</label>
            <div className="relative">
              <select value={form.lokasiGedung} onChange={e => setForm(f => ({ ...f, lokasiGedung: e.target.value }))} className={selectCls}>
                <option value="">Select</option>
                {filters.lokasi.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Floor Level*</label>
            <input value={form.lokasiLantai} onChange={e => setForm(f => ({ ...f, lokasiLantai: e.target.value }))}
              placeholder="e.g. 15" className={inputCls} />
          </div>
        </div>

        <ToggleGroup label="Zone*" options={ZONE_OPTIONS}
          value={form.lokasiZona ?? ""} onChange={v => setForm(f => ({ ...f, lokasiZona: v }))} />
      </div>

      <div className="shrink-0 border-t border-zinc-100 px-4 py-3 flex items-center justify-end gap-2 bg-white">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={!requiredFilled || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Save edit
        </button>
      </div>
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
            <input type="date" value={form.tanggalPerencanaan}
              onChange={e => setForm(f => ({ ...f, tanggalPerencanaan: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Maintenance Execution*</label>
            <input type="date" value={form.tanggalPengerjaan}
              onChange={e => setForm(f => ({ ...f, tanggalPengerjaan: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 mb-1 block">Maintenance Done*</label>
            <input type="date" value={form.tanggalSelesai}
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
          <span className="absolute bottom-2 right-3 text-[10px] text-zinc-400">{form.jenisKerusakan.length}/90</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Damage Cause</label>
        <div className="relative">
          <textarea value={form.penyebab} rows={2}
            onChange={e => setForm(f => ({ ...f, penyebab: e.target.value.slice(0, 90) }))}
            placeholder="Someone knocked too hard..."
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none transition-[border-color,box-shadow] bg-white" />
          <span className="absolute bottom-2 right-3 text-[10px] text-zinc-400">{form.penyebab.length}/90</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Severity Level*</label>
        <div className="flex gap-1.5">
          {SEVERITY_OPTIONS.map(s => (
            <button key={s} type="button" onClick={() => setForm(f => ({ ...f, severity: s }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 active:scale-95 ${
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">Rp.</span>
          <input type="text" value={form.biayaPerbaikan} placeholder="00,00"
            onChange={e => setForm(f => ({ ...f, biayaPerbaikan: e.target.value }))}
            className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Spareparts Involved</label>
        <input value={form.sparePartDigunakan}
          onChange={e => setForm(f => ({ ...f, sparePartDigunakan: e.target.value }))}
          placeholder="e.g. Thermostat, remote battery" className={inputCls} />
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Technicians Involved</label>
        <input value={form.teknisiPelaksana}
          onChange={e => setForm(f => ({ ...f, teknisiPelaksana: e.target.value }))}
          placeholder="e.g. Technician 1, Technician 2" className={inputCls} />
      </div>
    </div>
  );
}

// Replace Form Fields                                                       

function ReplaceFormFields({ form, setForm, asset }: {
  form: ReplaceForm;
  setForm: React.Dispatch<React.SetStateAction<ReplaceForm>>;
  asset: Asset;
}) {
  const inputCls = "flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white";

  return (
    <div className="space-y-3.5">
      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Execution Date*</label>
        <input type="date" value={form.tanggalPengerjaan}
          onChange={e => setForm(f => ({ ...f, tanggalPengerjaan: e.target.value }))}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white" />
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
              <p className="text-xs font-semibold text-zinc-800">{asset.idAset}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
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

      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-700">Replace With</p>
        {[
          { key: "idAsetBaru" as const, label: "Name*", placeholder: "e.g. MIT-E0IF-0028" },
          { key: "merekBaru" as const, label: "Manufacturer*", placeholder: asset.merek ?? "e.g. Mitsubishi" },
          { key: "modelBaru" as const, label: "Model*", placeholder: asset.model ?? "e.g. SMRG-08712" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="text-xs text-zinc-500 w-24 shrink-0">{label}</label>
            <input value={form[key]} placeholder={placeholder}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inputCls} />
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Damage Cause*</label>
        <div className="relative">
          <textarea value={form.alasanPenggantian} rows={2}
            onChange={e => setForm(f => ({ ...f, alasanPenggantian: e.target.value.slice(0, 90) }))}
            placeholder="Someone knocked too hard..."
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none transition-[border-color,box-shadow] bg-white" />
          <span className="absolute bottom-2 right-3 text-[10px] text-zinc-400">{form.alasanPenggantian.length}/90</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Severity Level*</label>
        <div className="flex gap-1.5">
          {SEVERITY_OPTIONS.map(s => (
            <button key={s} type="button" onClick={() => setForm(f => ({ ...f, severity: s }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 active:scale-95 ${
                form.severity === s ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 mb-1 block">Replacement Cost*</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">Rp.</span>
          <input type="text" value={form.biayaPenggantian} placeholder="00,00"
            onChange={e => setForm(f => ({ ...f, biayaPenggantian: e.target.value }))}
            className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white" />
        </div>
      </div>
    </div>
  );
}

// Add Maintenance Form                                                      

function AddMaintenanceForm({ asset, initialType = "repair", onSave, onCancel, onDirtyChange }: {
  asset: Asset;
  initialType?: "repair" | "replace";
  onSave: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [type, setType] = useState<"repair" | "replace">(initialType);
  const [repair, setRepair] = useState<RepairForm>(INIT_REPAIR);
  const [replace, setReplace] = useState<ReplaceForm>(INIT_REPLACE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const repairReq = [repair.tanggalPengerjaan, repair.tanggalSelesai, repair.jenisKerusakan, repair.severity, repair.biayaPerbaikan];
  const repairAllFilled = repairReq.every(v => v.trim() !== "");
  const repairAnyFilled = Object.values(repair).some(v => v.trim() !== "");

  const replaceReq = [replace.tanggalPengerjaan, replace.idAsetBaru, replace.merekBaru, replace.modelBaru, replace.alasanPenggantian, replace.severity, replace.biayaPenggantian];
  const replaceAllFilled = replaceReq.every(v => v.trim() !== "");
  const replaceAnyFilled = replaceReq.some(v => v.trim() !== "");

  // Report dirty state up so the page can guard against navigating away with unsaved input
  const dirty = repairAnyFilled || replaceAnyFilled;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  async function handleSave() {
    if (type === "repair") {
      if (!repairAnyFilled) return;
      if (!repairAllFilled) { setShowWarning(true); return; }
    } else {
      if (!replaceAnyFilled) return;
      if (!replaceAllFilled) { setShowWarning(true); return; }
    }

    setSaving(true);
    setError(null);
    try {
      const body = type === "repair"
        ? {
            maintenanceType: "Repair",
            tanggalPerencanaan: repair.tanggalPerencanaan || null,
            tanggalPengerjaan: repair.tanggalPengerjaan,
            tanggalSelesai: repair.tanggalSelesai,
            jenisKerusakan: repair.jenisKerusakan,
            penyebab: repair.penyebab || null,
            severity: SEVERITY_EN_TO_ID[repair.severity] ?? repair.severity,
            severityScore: SEVERITY_SCORE_MAP[repair.severity] ?? null,
            biayaPerbaikan: parseBiaya(repair.biayaPerbaikan),
            sparePartDigunakan: repair.sparePartDigunakan || null,
            teknisiPelaksana: repair.teknisiPelaksana || null,
          }
        : null;

      const isReplace = type === "replace";
      const endpoint = isReplace
        ? `/api/assets/${encodeURIComponent(asset.idAset)}/replace`
        : `/api/assets/${encodeURIComponent(asset.idAset)}/komplain`;
      const replaceBody = isReplace ? {
        idAsetBaru: replace.idAsetBaru,
        merekBaru: replace.merekBaru,
        modelBaru: replace.modelBaru,
        tanggalPenggantian: replace.tanggalPengerjaan,
        alasanPenggantian: replace.alasanPenggantian,
        severity: SEVERITY_EN_TO_ID[replace.severity] ?? replace.severity,
        biayaPenggantian: parseBiaya(replace.biayaPenggantian),
      } : null;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isReplace ? replaceBody : body),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to save");
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-zinc-800">Add Maintenance Log</p>
          {type === "replace" && (
            <button onClick={onCancel}
              className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}

        <div className="mb-4">
          <p className="text-xs font-medium text-zinc-600 mb-2">Maintenance Type</p>
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            {(["repair", "replace"] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors duration-100 ${
                  type === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}>
                {t === "repair" ? "Repair" : "Replace"}
              </button>
            ))}
          </div>
        </div>

        {type === "repair"
          ? <RepairFormFields form={repair} setForm={setRepair} />
          : <ReplaceFormFields form={replace} setForm={setReplace} asset={asset} />
        }
      </div>

      <div className="shrink-0 border-t border-zinc-100 px-4 py-3 flex items-center justify-end gap-2 bg-white">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Save Log
        </button>
      </div>

      {showWarning && createPortal(
        <IncompleteWarningModal
          onContinue={() => setShowWarning(false)}
          onLeave={() => { setShowWarning(false); onCancel(); }}
        />,
        document.body,
      )}
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
    ? `Replaced with ${[entry.merekBaru, entry.modelBaru].filter(Boolean).join(" ") || (entry.idAsetBaru ?? "—")}`
    : (entry.jenisKerusakan ?? "No Issue");
  const issueColor = isReplace
    ? "text-indigo-600"
    : entry.jenisKerusakan
    ? "text-red-500"
    : "text-zinc-400";

  return (
    <div>
      <button onClick={onToggle}
        className="w-full text-left py-3 border-b border-zinc-100 hover:bg-zinc-50/60 transition-colors duration-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-800">{fmtLogDate(entry.tanggalPengerjaan)}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{entry.maintenanceType} · {fmtCost(entry.biaya)}</p>
          </div>
          <p className={`text-[11px] font-medium ${issueColor} text-right leading-tight shrink-0 max-w-[45%]`}>
            {issueText}
          </p>
        </div>
      </button>

      {expanded && (
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
                  <p className="text-[11px] font-semibold">{asset.idAset}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{[asset.merek, asset.model].filter(Boolean).join(" ") || "—"}</p>
                </div>
                <div className="flex items-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-2.5">
                  <p className="text-[11px] font-semibold text-zinc-800">{entry.idAsetBaru ?? "—"}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{[entry.merekBaru, entry.modelBaru].filter(Boolean).join(" ") || "—"}</p>
                </div>
              </div>
              {entry.alasanPenggantian && (
                <div>
                  <p className="text-[10px] text-zinc-400 mb-1">Cause of Replacement</p>
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
                      <p className="text-[9px] text-zinc-400">Start</p>
                      <p className="text-[10px] font-medium text-zinc-700">{fmtLogDate(entry.tanggalPengerjaan)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-zinc-400">Done</p>
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
                    <p className="text-[10px] text-zinc-400 mb-1">What&apos;s Fixed</p>
                    <p className="text-xs text-zinc-700">{entry.jenisKerusakan ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 mb-1">Cause</p>
                    <p className="text-xs text-zinc-700">{entry.penyebab ?? "—"}</p>
                  </div>
                </div>
              )}
              {entry.sparePartDigunakan && (
                <div className="flex items-start gap-2">
                  <Wrench className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-zinc-600">{entry.sparePartDigunakan}</p>
                </div>
              )}
              {entry.teknisiPelaksana && (
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-zinc-600">{entry.teknisiPelaksana}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
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
  const filtered = typeFilter ? entries.filter(e => e.maintenanceType === typeFilter) : entries;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>;
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
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          {typeFilter && (
            <button onClick={() => onTypeFilterChange("")} className="text-[11px] text-indigo-600 hover:underline">
              Clear All
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-xs text-zinc-400">
          {typeFilter ? "No records for this type." : "No maintenance history found."}
        </p>
      ) : (
        filtered.map(e => (
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

function FilterCombobox({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropVis, setDropVis] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDropVis(open));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const filtered = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;

  function pick(v: string) { onChange(v); setOpen(false); setQuery(""); }
  function clear(e: React.MouseEvent) { e.stopPropagation(); onChange(""); setOpen(false); setQuery(""); }

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center rounded-lg border bg-white shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ${
        open ? "border-indigo-300 ring-2 ring-indigo-100" : value ? "border-indigo-200 bg-indigo-50/50" : "border-zinc-200 hover:border-zinc-300"
      }`}>
        <input type="text" value={open ? query : value} placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={`min-w-0 w-28 bg-transparent pl-3 py-2 text-xs focus:outline-none placeholder:text-zinc-400 ${value && !open ? "text-indigo-600 font-medium" : "text-zinc-700"}`} />
        {value && !open
          ? <button onClick={clear} className="px-2 text-zinc-400 hover:text-zinc-600 transition-colors"><X className="w-3 h-3" /></button>
          : <ChevronDown className={`mr-2 w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        }
      </div>
      {open && (
        <div className={`absolute top-[calc(100%+4px)] left-0 z-50 min-w-full w-max max-w-56 rounded-xl border border-zinc-100 bg-white shadow-lg origin-top transition-[opacity,transform] duration-150 ${dropVis ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0
              ? <p className="px-3 py-2.5 text-xs text-zinc-400 italic">No matches</p>
              : filtered.map(o => (
                <button key={o} onMouseDown={e => e.preventDefault()} onClick={() => pick(o)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors duration-100 ${value === o ? "bg-indigo-50 text-indigo-600 font-medium" : "text-zinc-600 hover:bg-zinc-50"}`}>
                  {o}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// Main Page                                                                 

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, Critical: 0, Major: 0, Minor: 0, Healthy: 0 });
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
  const [replaceLogs, setReplaceLogs] = useState<ReplaceLog[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [riskFilter, setRiskFilter] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Panel state
  const [panelView, setPanelView] = useState<PanelView>("overview");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [maintenanceTypeFilter, setMaintenanceTypeFilter] = useState("");
  const [addMaintenanceInitialType, setAddMaintenanceInitialType] = useState<"repair" | "replace">("repair");

  // Unsaved-changes guard for the add-maintenance and edit-asset forms
  const [maintenanceDirty, setMaintenanceDirty] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);

  // Animation refs
  const riskTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [riskIndicator, setRiskIndicator] = useState({ left: 0, width: 0, ready: false });
  const panelTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [panelIndicator, setPanelIndicator] = useState({ left: 0, width: 0, ready: false });
  const [panelVis, setPanelVis] = useState(false);

  const router = useRouter();
  const LIMIT = 50;

  useEffect(() => {
    fetch("/api/assets/filters")
      .then(r => r.json())
      .then(data => setFilters({
        kategori: Array.isArray(data.kategori) ? data.kategori : [],
        tipe: Array.isArray(data.tipe) ? data.tipe : [],
        lokasi: Array.isArray(data.lokasi) ? data.lokasi : [],
        jadwal: Array.isArray(data.jadwal) ? data.jadwal : [],
      }))
      .catch(err => console.error("Failed to load filters:", err));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildParams = useCallback(
    () => new URLSearchParams({
      page: String(page), limit: String(LIMIT), status: "Aktif",
      ...(selectedKategori && { kategori: selectedKategori }),
      ...(selectedTipe && { tipe: selectedTipe }),
      ...(selectedLokasi && { lokasi: selectedLokasi }),
      ...(selectedJadwal && { jadwal: FREQ_TO_JADWAL[selectedJadwal] ?? selectedJadwal }),
      ...(search && { search }),
      ...(riskFilter !== "All" && { kekritisan: riskFilter }),
    }),
    [page, selectedKategori, selectedTipe, selectedLokasi, selectedJadwal, search, riskFilter],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/assets?${buildParams()}`);
        const json = await res.json();
        if (!cancelled) { setAssets(json.data ?? []); setTotal(json.total ?? 0); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [buildParams]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?${buildParams()}`);
      const json = await res.json();
      setAssets(json.data ?? []); setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Per-risk-level counts (ignores the active risk tab so each tab shows its own total)
  const buildCountParams = useCallback(
    () => new URLSearchParams({
      status: "Aktif",
      ...(selectedKategori && { kategori: selectedKategori }),
      ...(selectedTipe && { tipe: selectedTipe }),
      ...(selectedLokasi && { lokasi: selectedLokasi }),
      ...(selectedJadwal && { jadwal: FREQ_TO_JADWAL[selectedJadwal] ?? selectedJadwal }),
      ...(search && { search }),
    }),
    [selectedKategori, selectedTipe, selectedLokasi, selectedJadwal, search],
  );

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/counts?${buildCountParams()}`);
      const json = await res.json();
      setCounts(json);
    } catch {
      /* counts are non-critical */
    }
  }, [buildCountParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/assets/counts?${buildCountParams()}`);
        const json = await res.json();
        if (!cancelled) setCounts(json);
      } catch {
        /* counts are non-critical */
      }
    })();
    return () => { cancelled = true; };
  }, [buildCountParams]);

  // Risk tab indicator
  useEffect(() => {
    const idx = RISK_TABS.indexOf(riskFilter);
    const el = riskTabRefs.current[idx];
    if (!el) return;
    setRiskIndicator({ left: el.offsetLeft + 12, width: el.offsetWidth - 24, ready: true });
  }, [riskFilter, counts]);

  // Panel entry animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setPanelVis(!!modalAsset));
    return () => cancelAnimationFrame(id);
  }, [modalAsset]);

  // Panel tab sliding indicator
  useEffect(() => {
    const activeIdx = (panelView === "overview" || panelView === "edit") ? 0 : 1;
    const el = panelTabRefs.current[activeIdx];
    if (!el) return;
    setPanelIndicator({ left: el.offsetLeft + 8, width: el.offsetWidth - 16, ready: true });
  }, [panelView, modalAsset]);

  async function runPrediction() {
    setPredicting(true); setPredMsg(null);
    try {
      const res = await fetch("/api/assets/predict", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setPredMsg(`Prediction failed: ${json.message ?? "Server error"}`);
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
      severity: r.severity,
      idAsetBaru: r.idAsetBaru,
      merekBaru: r.merekBaru,
      modelBaru: r.modelBaru,
      alasanPenggantian: r.alasanPenggantian,
    }));
    return [...fromKomplain, ...fromReplace].sort((a, b) => {
      if (!a.tanggalPengerjaan) return 1;
      if (!b.tanggalPengerjaan) return -1;
      return new Date(b.tanggalPengerjaan).getTime() - new Date(a.tanggalPengerjaan).getTime();
    });
  }

  async function openModal(asset: Asset) {
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
    setModalAsset(null);
    setPanelView("overview");
    setPanelIndicator({ left: 0, width: 0, ready: false });
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
  }

  async function handleMaintenanceSave() {
    if (!modalAsset) return;
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
    setMaintenanceDirty(false);
    setPanelView("maintenance-history");
  }

  const handleFilterChange = (type: "kategori" | "tipe" | "lokasi" | "jadwal", value: string) => {
    if (type === "kategori") setSelectedKategori(value);
    else if (type === "tipe") setSelectedTipe(value);
    else if (type === "lokasi") setSelectedLokasi(value);
    else if (type === "jadwal") setSelectedJadwal(value);
    setPage(1);
  };

  const hasActiveFilters = selectedKategori !== "" || selectedTipe !== "" || selectedLokasi !== "" || selectedJadwal !== "" || search !== "" || riskFilter !== "All";

  function resetFilters() {
    setSelectedKategori(""); setSelectedTipe(""); setSelectedLokasi(""); setSelectedJadwal("");
    setSearchInput(""); setSearch(""); setRiskFilter("All"); setPage(1);
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

  const showCurrentLife = panelView === "maintenance-history" || panelView === "add-maintenance";

  return (
    <div className="-m-4 md:-m-8 flex overflow-hidden" style={{ height: "calc(100svh - 5rem - 2rem)" }}>

      {/*    Left: Table    */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 p-4 md:p-6">

        {/* Risk tabs */}
        <div className="relative flex items-end gap-0 border-b border-zinc-100 mb-4 shrink-0">
          {RISK_TABS.map((tab, i) => {
            const tabCount = tab === "All" ? counts.all : counts[tab as keyof typeof counts];
            const isActive = riskFilter === tab;
            return (
              <button key={tab} ref={el => { riskTabRefs.current[i] = el; }}
                onClick={() => { setRiskFilter(tab); setPage(1); }}
                className={`px-4 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap ${isActive ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600"}`}>
                {tab === "All" ? "All Assets" : tab}
                {isActive && (
                  <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-600">
                    {tabCount.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
          {riskIndicator.ready && (
            <span className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-indigo-600 rounded-full transition-[transform,width] duration-200"
              style={{ transform: `translateX(${riskIndicator.left}px)`, width: `${riskIndicator.width}px`, transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }} />
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-700 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-[border-color,box-shadow]" />
          </div>
          <FilterCombobox value={selectedLokasi} onChange={v => handleFilterChange("lokasi", v)} options={filters.lokasi} placeholder="Location" />
          <FilterCombobox value={selectedJadwal} onChange={v => handleFilterChange("jadwal", v)} options={FREQ_OPTIONS} placeholder="Frequency" />
          <FilterCombobox value={selectedTipe} onChange={v => handleFilterChange("tipe", v)} options={filters.tipe} placeholder="Asset Type" />
          <FilterCombobox value={selectedKategori} onChange={v => handleFilterChange("kategori", v)} options={filters.kategori} placeholder="Category" />
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
            <button onClick={() => setPredMsg(null)} className="ml-2 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
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
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {showCurrentLife ? "Current Life" : "Installation Date"}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Location</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Risk Level</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-16 text-center text-zinc-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <p className="text-xs">Loading assets…</p>
                  </td></tr>
                ) : assets.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-sm text-zinc-400">No assets found.</td></tr>
                ) : (
                  assets.map(a => {
                    const selected = modalAsset?.id === a.id;
                    return (
                      <tr key={a.id} onClick={() => guardedNav(() => openModal(a))}
                        className={`cursor-pointer transition-colors duration-100 ${selected ? "bg-indigo-50 border-l-2 border-indigo-500" : "hover:bg-indigo-50/50"}`}>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-indigo-600">{a.idAset}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{a.tipe ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-600">{a.kategori ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {showCurrentLife
                            ? currentLife(a.tglInstalasi)
                            : a.tglInstalasi
                            ? new Date(a.tglInstalasi).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {[a.lokasiGedung, a.lokasiLantai, a.lokasiZona].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${RISK_COLORS[a.kekritisan ?? ""] ?? RISK_COLORS.Healthy}`}>
                            {a.kekritisan ?? "Healthy"}
                          </span>
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
            <span className="text-xs text-zinc-400">Showing {showingFrom} to {showingTo} of {total.toLocaleString()} assets</span>
            <div className="flex items-center gap-3">
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-zinc-500" />
                  </button>
                  {pageNums.map((n, i) => n === "…"
                    ? <span key={`e${i}`} className="px-1 text-xs text-zinc-400">…</span>
                    : <button key={n} onClick={() => setPage(n as number)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-[background-color,color] duration-150 ${page === n ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-100"}`}>
                        {n}
                      </button>
                  )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors">
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
          <p className="mt-2 text-[10px] text-zinc-400 shrink-0">Prediction last run: {lastPredictedAt}</p>
        )}
      </div>

      {/*    Right: Detail Panel    */}
      {modalAsset && (
        <div
          className={`w-80 xl:w-96 shrink-0 border-l border-zinc-100 flex flex-col bg-white overflow-hidden transition-[transform,opacity] duration-200 motion-reduce:transition-opacity ${
            panelVis ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
        >
          {/* Header */}
          <div className="relative overflow-hidden p-5 bg-gradient-to-br from-white to-indigo-50/30 shrink-0">
            <GeoDeco />
            <div className="relative z-10 flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs text-zinc-400 mb-0.5">{modalAsset.tipe ?? "Asset"}</p>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{modalAsset.idAset}</h2>
                  {panelView === "overview" && (
                    <button onClick={() => setPanelView("edit")}
                      className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-[background-color,color] duration-150">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {[modalAsset.kategori, modalAsset.lokasiGedung].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <button onClick={() => guardedNav(closePanel)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:scale-95 transition-[background-color,color,transform] duration-150 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="relative flex border-b border-zinc-100 px-4 shrink-0">
            <button ref={el => { panelTabRefs.current[0] = el; }}
              onClick={() => guardedNav(() => setPanelView("overview"))}
              className={`px-3 py-2.5 text-xs font-medium transition-colors duration-150 ${
                (panelView === "overview" || panelView === "edit") ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600"
              }`}>
              Overview
            </button>
            <button ref={el => { panelTabRefs.current[1] = el; }}
              onClick={() => guardedNav(() => setPanelView("maintenance-history"))}
              className={`px-3 py-2.5 text-xs font-medium transition-colors duration-150 ${
                (panelView === "maintenance-history" || panelView === "add-maintenance") ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600"
              }`}>
              {panelView === "add-maintenance" ? "Maintenance" : "Maintenance History"}
            </button>
            {panelIndicator.ready && (
              <span className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-indigo-600 rounded-full transition-[transform,width] duration-200"
                style={{ transform: `translateX(${panelIndicator.left}px)`, width: `${panelIndicator.width}px`, transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
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
                onGoToReplace={() => goToAddMaintenance("replace")}
                onDirtyChange={setEditDirty}
              />
            )}

            {panelView === "maintenance-history" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4">
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
                  <button onClick={() => goToAddMaintenance("repair")}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-[background-color] duration-150 active:scale-[0.98]">
                    <Plus className="w-3.5 h-3.5" /> Add Maintenance
                  </button>
                </div>
              </div>
            )}

            {panelView === "add-maintenance" && (
              <AddMaintenanceForm
                asset={modalAsset}
                initialType={addMaintenanceInitialType}
                onSave={handleMaintenanceSave}
                onCancel={() => { setMaintenanceDirty(false); setPanelView("maintenance-history"); }}
                onDirtyChange={setMaintenanceDirty}
              />
            )}
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
    </div>
  );
}
