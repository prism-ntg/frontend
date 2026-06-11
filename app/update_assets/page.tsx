"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSpreadsheet, Trash2, Save, Upload, ChevronDown,
  Loader2, X, CheckCircle, AlertCircle, Pencil, Plus,
  ArrowLeft, AlertTriangle, Server, Search,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AssetDraft {
  draftId: string;
  // Step 1
  namaPrefix: string;
  nextIdAset: number | null;
  assetModel: string;
  assetStatus: "Aktif" | "Rusak" | "Diganti";
  tipe: string;
  kategori: string;
  subKategori: string;
  merek: string;
  tglInstalasi: string;
  kekritisan: "Critical" | "Major" | "Minor" | "";
  frequency: "Daily" | "Weekly" | "Monthly" | "Yearly" | "Reactive" | "";
  lokasiGedung: string;
  lokasiLantai: string;
  lokasiZona: "Timur" | "Barat" | "Utara" | "Selatan" | "";
  // Step 2
  logType: "repair" | "";
  lastPlanned: string;
  lastExecFrom: string;
  lastExecTo: string;
  damageDesc: string;
  damageCause: string;
  severity: "Fatal" | "Serious" | "Sedang" | "Ringan" | "";
  repairCost: string;
  spareParts: string;
  technician: string;
}

interface DropdownOptions {
  tipe: string[];
  kategori: string[];
  subKategori: string[];
  merek: string[];
  lokasiGedung: string[];
  lokasiLantai: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyDraft(): AssetDraft {
  return {
    draftId: crypto.randomUUID(),
    namaPrefix: "",
    nextIdAset: null,
    assetModel: "",
    assetStatus: "Aktif",
    tipe: "",
    kategori: "",
    subKategori: "",
    merek: "",
    tglInstalasi: "",
    kekritisan: "",
    frequency: "",
    lokasiGedung: "",
    lokasiLantai: "",
    lokasiZona: "",
    logType: "",
    lastPlanned: "",
    lastExecFrom: "",
    lastExecTo: "",
    damageDesc: "",
    damageCause: "",
    severity: "",
    repairCost: "",
    spareParts: "",
    technician: "",
  };
}


function freqToJadwal(f: string): string {
  const map: Record<string, string> = {
    Daily: "Harian", Weekly: "Mingguan", Monthly: "Bulanan",
    Yearly: "Tahunan", Reactive: "Reactive",
  };
  return map[f] ?? f;
}

function severityToDb(s: string): string {
  if (s === "Serious") return "Berat";
  return s;
}

function formatAssetName(prefix: string, id: number): string {
  return `${prefix}-${String(id).padStart(4, "0")}`;
}

function formatRupiah(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return "Rp" + Number(digits).toLocaleString("id-ID");
}

const STEP1_REQUIRED: { key: keyof AssetDraft; label: string }[] = [
  { key: "namaPrefix", label: "Asset Name" },
  { key: "assetModel", label: "Asset Model" },
  { key: "assetStatus", label: "Asset Status" },
  { key: "tipe", label: "Asset Type" },
  { key: "kategori", label: "Category" },
  { key: "subKategori", label: "Sub-category" },
  { key: "merek", label: "Manufacturer" },
  { key: "tglInstalasi", label: "Installation Date" },
  { key: "kekritisan", label: "Priority to Company" },
  { key: "frequency", label: "Maintenance Frequency" },
  { key: "lokasiGedung", label: "Building" },
  { key: "lokasiLantai", label: "Floor Level" },
  { key: "lokasiZona", label: "Zone" },
];

// ─── Modals ──────────────────────────────────────────────────────────────────

function IncompleteWarningModal({
  missingFields,
  onContinue,
  onClose,
}: {
  missingFields: string[];
  onContinue: () => void;
  onClose: () => void;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVis(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${vis ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4 transition-[opacity,transform] duration-200 ${vis ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      >
        <div className="flex flex-col items-center text-center gap-3 mb-4">
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
        {missingFields.length > 0 && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            <p className="text-[11px] text-amber-700 font-medium mb-1">Missing fields:</p>
            <p className="text-[11px] text-amber-600">{missingFields.join(", ")}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
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

function LeavePageWarningModal({
  onLeave,
  onStay,
}: {
  onLeave: () => void;
  onStay: () => void;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVis(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${vis ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4 transition-[opacity,transform] duration-200 ${vis ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      >
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Leave Page?</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              You have unsaved changes. If you leave now, your progress will be lost.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStay}
            className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            Stay
          </button>
          <button
            onClick={onLeave}
            className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-xs font-semibold text-white hover:bg-amber-600 active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteDraftModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVis(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${vis ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4 transition-[opacity,transform] duration-200 ${vis ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      >
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Delete Asset</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              This asset will be removed from the list. This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form UI Components ───────────────────────────────────────────────────────

function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  colorMap,
  labels,
}: {
  options: T[];
  value: T | "";
  onChange: (v: T) => void;
  colorMap?: Record<string, string>;
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const customColor = colorMap?.[opt];
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 ${
              customColor && active
                ? customColor
                : active
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {labels?.[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}

function DateField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

function CurrencyField({
  value,
  onChange,
  placeholder = "Rp.00,00",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatRupiah(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

function DropdownAddable({
  value,
  onChange,
  options,
  onAddOption,
  placeholder,
  disabled = false,
  dropUp = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onAddOption: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  dropUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto-focus search input when panel opens; clear search when it closes
  useEffect(() => {
    const id = setTimeout(() => {
      if (open) searchRef.current?.focus();
      else setSearch("");
    }, 10);
    return () => clearTimeout(id);
  }, [open]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );
  const canAdd =
    search.trim() !== "" &&
    !options.some((o) => o.toLowerCase() === search.trim().toLowerCase());

  function handleSelect(opt: string) {
    onChange(opt);
    setOpen(false);
    setSearch("");
  }

  function handleAdd() {
    const v = search.trim();
    if (!v) return;
    if (!options.includes(v)) onAddOption(v);
    onChange(v);
    setOpen(false);
    setSearch("");
  }

  const panelPos = dropUp ? "bottom-full mb-1" : "top-full mt-1";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-sm text-left transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
          open ? "border-indigo-300 ring-2 ring-indigo-200" : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <span className={value ? "text-zinc-700" : "text-zinc-400"}>{value || placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-150 shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className={`absolute ${panelPos} left-0 right-0 z-50 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden`}>
          {/* Search */}
          <div className="p-2 border-b border-zinc-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (filtered.length === 1) handleSelect(filtered[0]);
                    else if (canAdd) handleAdd();
                  }
                  if (e.key === "Escape") { setOpen(false); setSearch(""); }
                }}
                placeholder="Search..."
                className="w-full rounded-md border border-zinc-200 pl-7 pr-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-zinc-400 italic">
                {search ? `No results for "${search}"` : "No options yet"}
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors duration-100 ${
                    value === opt ? "bg-indigo-50 text-indigo-700 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>

          {/* Add button — only shown when typed text is not already in list */}
          {canAdd && (
            <div className="border-t border-zinc-100 p-2">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors duration-150"
              >
                <Plus className="w-3 h-3" />
                Add &ldquo;{search.trim()}&rdquo;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Draft Card ───────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  active,
  onEdit,
  onDelete,
}: {
  draft: AssetDraft;
  active: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayName =
    draft.namaPrefix && draft.nextIdAset
      ? formatAssetName(draft.namaPrefix, draft.nextIdAset)
      : draft.namaPrefix || "Unnamed Asset";

  return (
    <div
      className={`rounded-xl border p-3 transition-all duration-200 cursor-pointer ${
        active
          ? "border-indigo-300 bg-indigo-50/60 shadow-sm"
          : "border-zinc-200 bg-white hover:border-indigo-200 hover:shadow-sm"
      }`}
      onClick={onEdit}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
          <Server className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-800 truncate">{displayName}</p>
          <p className="text-[11px] text-zinc-400 truncate">{draft.tipe || "—"}</p>
        </div>
      </div>
      <div className="h-0.5 w-full rounded-full bg-indigo-400/60 mb-3" />
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-600 transition-colors active:scale-95"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="ml-auto flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-500 hover:bg-red-100 transition-all duration-150 active:scale-95"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── CSV Panel ────────────────────────────────────────────────────────────────

const REQUIRED_COLS = [
  "ID_Aset", "Kategori", "Sub_Kategori", "Tipe", "Lokasi",
  "Tanggal_Instalasi", "Tingkat_Kekritisan", "Biaya_Perbaikan",
  "Biaya_Penggantian", "Jenis_Kerusakan", "Tanggal_Perbaikan",
];

function CsvPanel({ onSubmitSuccess }: { onSubmitSuccess: (n: number) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/assets/import", { method: "POST", body: fd });
      const json = await res.json();
      setResult({ created: json.created ?? 0, errors: json.errors ?? [] });
      if (json.created > 0) onSubmitSuccess(json.created);
    } catch {
      setResult({ created: 0, errors: ["Network error — please try again"] });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-base font-semibold text-zinc-800 mb-4">Import Data</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f && (f.name.endsWith(".csv") || f.name.endsWith(".xlsx"))) setFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-14 mb-6 ${
            dragging ? "border-green-400 bg-green-50"
            : file ? "border-green-400 bg-green-50/60"
            : "border-green-300 bg-green-50/40 hover:bg-green-50 hover:border-green-400"
          }`}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-7 h-7 text-green-600" />
          </div>
          {file ? (
            <div className="text-center">
              <p className="text-sm font-medium text-green-700">{file.name}</p>
              <p className="text-xs text-green-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                Import CSV or XLSX <Upload className="w-4 h-4" />
              </p>
              <p className="text-xs text-green-500 mt-1">Drag & drop or click to browse</p>
            </div>
          )}
          {file && (
            <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="absolute top-3 right-3 p-1 rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm font-medium text-zinc-700 mb-3">
          Required Columns <span className="text-zinc-400 font-normal">({REQUIRED_COLS.length})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {REQUIRED_COLS.map((col) => (
            <span key={col} className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">{col}</span>
          ))}
        </div>
        {result && (
          <div className={`mt-4 rounded-xl border p-4 ${result.errors.length === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div className="flex items-center gap-2 mb-1">
              {result.errors.length === 0
                ? <CheckCircle className="w-4 h-4 text-green-600" />
                : <AlertCircle className="w-4 h-4 text-yellow-600" />}
              <p className="text-sm font-medium text-zinc-700">{result.created} asset(s) imported</p>
            </div>
            {result.errors.map((e, i) => <p key={i} className="text-xs text-yellow-700 mt-1">{e}</p>)}
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-zinc-100 px-6 py-4 flex justify-end">
        <button onClick={handleSubmit} disabled={!file || submitting}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          {submitting ? "Importing…" : "Submit Asset(s)"}
        </button>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, onBack }: { step: 1 | 2; onBack?: () => void }) {
  return (
    <div className="flex items-center px-6 pt-5 pb-4 border-b border-zinc-100">
      <button
        type="button"
        onClick={step === 2 ? onBack : undefined}
        className={`flex items-center gap-2.5 transition-opacity duration-150 ${
          step === 2 ? "cursor-pointer hover:opacity-70" : "cursor-default"
        }`}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          step >= 1 ? "bg-indigo-600 text-white" : "border-2 border-zinc-300 text-zinc-400"
        }`}>1</div>
        <span className={`text-sm font-medium ${step === 1 ? "text-indigo-600" : "text-zinc-500"}`}>
          Asset Information<span className="text-red-400">*</span>
        </span>
      </button>

      <div className="flex-1 h-px bg-zinc-200 mx-4" />

      <div className="flex items-center gap-2.5">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          step === 2 ? "bg-indigo-600 text-white" : "border-2 border-zinc-300 text-zinc-400"
        }`}>2</div>
        <span className={`text-sm font-medium ${step === 2 ? "text-indigo-600" : "text-zinc-400"}`}>
          Maintenance History
        </span>
      </div>
    </div>
  );
}

// ─── Step 1: Asset Information ────────────────────────────────────────────────

function AssetInfoStep({
  form,
  setField,
  dbOptions,
  localOptions,
  addLocalOption,
  nameCheck,
  nameCheckLoading,
}: {
  form: AssetDraft;
  setField: <K extends keyof AssetDraft>(k: K, v: AssetDraft[K]) => void;
  dbOptions: DropdownOptions;
  localOptions: DropdownOptions;
  addLocalOption: (field: keyof DropdownOptions, v: string) => void;
  nameCheck: { nextId: number; nameExists: boolean } | null;
  nameCheckLoading: boolean;
}) {
  function mergedOptions(field: keyof DropdownOptions, numeric = false): string[] {
    const set = new Set([...dbOptions[field], ...localOptions[field]]);
    const arr = Array.from(set).filter(Boolean);
    if (numeric) {
      return arr.sort((a, b) => {
        const na = parseFloat(a), nb = parseFloat(b);
        return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
      });
    }
    return arr.sort();
  }

  const labelClass = "block text-xs font-medium text-zinc-600 mb-1.5";
  const req = <span className="text-red-400 ml-0.5">*</span>;

  return (
    <div className="space-y-0">
      {/* Row 1: Asset Name | Asset Model | Asset Status */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <label className={labelClass}>Asset Name{req}</label>
          <input
            type="text"
            value={form.namaPrefix}
            onChange={(e) => setField("namaPrefix", e.target.value.toUpperCase())}
            placeholder="e.g. MIT-E0IF"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
          />
          <div className="mt-1 min-h-[16px]">
            {nameCheckLoading && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking…
              </span>
            )}
            {!nameCheckLoading && nameCheck && form.namaPrefix && (
              nameCheck.nameExists ? (
                <p className="text-[11px] text-red-500">Asset name already existed</p>
              ) : (
                <p className="text-[11px] text-green-600">
                  Your new asset {formatAssetName(form.namaPrefix, nameCheck.nextId)}
                </p>
              )
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Asset Model{req}</label>
          <input
            type="text"
            value={form.assetModel}
            onChange={(e) => setField("assetModel", e.target.value)}
            placeholder="e.g. MSY-GN-792"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
          />
        </div>

        <div>
          <label className={labelClass}>Asset Status{req}</label>
          <RadioGroup<"Aktif" | "Rusak" | "Diganti">
            options={["Aktif", "Rusak", "Diganti"]}
            value={form.assetStatus}
            onChange={(v) => setField("assetStatus", v)}
            labels={{ Aktif: "Active", Rusak: "Damaged", Diganti: "Replaced" }}
          />
        </div>
      </div>

      <div className="border-t border-zinc-100 mb-5" />

      {/* Row 2: Asset Type | Category / Sub-category */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <label className={labelClass}>Asset Type{req}</label>
          <DropdownAddable
            value={form.tipe}
            onChange={(v) => setField("tipe", v)}
            options={mergedOptions("tipe")}
            onAddOption={(v) => addLocalOption("tipe", v)}
            placeholder="e.g. Air Conditioner"
          />
        </div>

        <div className="col-span-2 flex items-end gap-2">
          <div className="flex-1">
            <label className={labelClass}>Category{req}</label>
            <DropdownAddable
              value={form.kategori}
              onChange={(v) => setField("kategori", v)}
              options={mergedOptions("kategori")}
              onAddOption={(v) => addLocalOption("kategori", v)}
              placeholder="e.g. Mechanical"
            />
          </div>
          <span className="text-zinc-400 pb-2.5 text-sm font-medium shrink-0">/</span>
          <div className="flex-1">
            <label className={labelClass}>Sub-category{req}</label>
            <DropdownAddable
              value={form.subKategori}
              onChange={(v) => setField("subKategori", v)}
              options={mergedOptions("subKategori")}
              onAddOption={(v) => addLocalOption("subKategori", v)}
              placeholder="e.g. Control Panel"
            />
          </div>
        </div>
      </div>

      {/* Row 3: Manufacturer | Installation Date | Priority to Company */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <label className={labelClass}>Manufacturer{req}</label>
          <DropdownAddable
            value={form.merek}
            onChange={(v) => setField("merek", v)}
            options={mergedOptions("merek")}
            onAddOption={(v) => addLocalOption("merek", v)}
            placeholder="e.g. Mitsubishi"
          />
        </div>

        <div>
          <label className={labelClass}>Installation Date{req}</label>
          <DateField value={form.tglInstalasi} onChange={(v) => setField("tglInstalasi", v)} />
        </div>

        <div>
          <label className={labelClass}>Priority to Company{req}</label>
          <RadioGroup<"Critical" | "Major" | "Minor">
            options={["Critical", "Major", "Minor"]}
            value={form.kekritisan}
            onChange={(v) => setField("kekritisan", v)}
          />
        </div>
      </div>

      {/* Row 4: Maintenance Frequency (full width) */}
      <div className="mb-5">
        <label className={labelClass}>Maintenance Frequency{req}</label>
        <RadioGroup<"Daily" | "Weekly" | "Monthly" | "Yearly" | "Reactive">
          options={["Daily", "Weekly", "Monthly", "Yearly", "Reactive"]}
          value={form.frequency}
          onChange={(v) => setField("frequency", v)}
        />
      </div>

      <div className="border-t border-zinc-100 mb-5" />

      {/* Row 5: Building | Floor Level | Zone */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Building{req}</label>
          <DropdownAddable
            value={form.lokasiGedung}
            onChange={(v) => setField("lokasiGedung", v)}
            options={mergedOptions("lokasiGedung")}
            onAddOption={(v) => addLocalOption("lokasiGedung", v)}
            placeholder="e.g. Gedung A"
            dropUp
          />
        </div>

        <div>
          <label className={labelClass}>Floor Level{req}</label>
          <DropdownAddable
            value={form.lokasiLantai}
            onChange={(v) => setField("lokasiLantai", v)}
            options={mergedOptions("lokasiLantai", true)}
            onAddOption={(v) => addLocalOption("lokasiLantai", v)}
            placeholder="e.g. 15"
            dropUp
          />
        </div>

        <div>
          <label className={labelClass}>Zone{req}</label>
          <RadioGroup<"Timur" | "Barat" | "Utara" | "Selatan">
            options={["Timur", "Barat", "Utara", "Selatan"]}
            value={form.lokasiZona}
            onChange={(v) => setField("lokasiZona", v)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Maintenance History ──────────────────────────────────────────────

function MaintenanceHistoryStep({
  form,
  setField,
}: {
  form: AssetDraft;
  setField: <K extends keyof AssetDraft>(k: K, v: AssetDraft[K]) => void;
}) {
  const labelClass = "block text-xs font-medium text-zinc-600 mb-1.5";

  const severityColorMap: Record<string, string> = {
    Fatal: "border-red-400 bg-red-50 text-red-600 shadow-sm",
    Serious: "border-orange-300 bg-orange-50 text-orange-600 shadow-sm",
    Sedang: "border-yellow-300 bg-yellow-50 text-yellow-600 shadow-sm",
    Ringan: "border-green-400 bg-green-50 text-green-600 shadow-sm",
  };

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-zinc-700">
        Latest Maintenance Log{" "}
        <span className="text-xs font-normal text-zinc-400">(optional)</span>
      </p>

      <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Last Planned Maintenance</label>
              <DateField value={form.lastPlanned} onChange={(v) => setField("lastPlanned", v)} />
            </div>
            <div>
              <label className={labelClass}>Last Maintenance Execution</label>
              <DateField value={form.lastExecFrom} onChange={(v) => setField("lastExecFrom", v)} />
            </div>
            <div>
              <label className={labelClass}>Last Maintenance Done</label>
              <DateField value={form.lastExecTo} onChange={(v) => setField("lastExecTo", v)} />
            </div>
          </div>

          <div className="border-t border-zinc-100" />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Damage Description</label>
              <div className="relative">
                <textarea
                  value={form.damageDesc}
                  onChange={(e) => setField("damageDesc", e.target.value.slice(0, 30))}
                  placeholder="Outdoor fan broken..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all resize-none"
                />
                <span className="absolute bottom-2 right-2 text-[10px] text-zinc-400">
                  {form.damageDesc.length}/30
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Damage Cause</label>
              <div className="relative">
                <textarea
                  value={form.damageCause}
                  onChange={(e) => setField("damageCause", e.target.value.slice(0, 30))}
                  placeholder="Prob due to overheating..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all resize-none"
                />
                <span className="absolute bottom-2 right-2 text-[10px] text-zinc-400">
                  {form.damageCause.length}/30
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Severity Level</label>
              <div className="flex flex-wrap gap-2">
                {(["Fatal", "Serious", "Sedang", "Ringan"] as const).map((s) => {
                  const displayLabel: Record<string, string> = {
                    Fatal: "Fatal", Serious: "Serious", Sedang: "Medium", Ringan: "Mild",
                  };
                  const active = form.severity === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setField("severity", active ? "" : s)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 ${
                        active && severityColorMap[s]
                          ? severityColorMap[s]
                          : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                      }`}
                    >
                      {displayLabel[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Total Repair Cost</label>
              <CurrencyField value={form.repairCost} onChange={(v) => setField("repairCost", v)} />
            </div>
            <div>
              <label className={labelClass}>Spareparts Involved</label>
              <input
                type="text"
                value={form.spareParts}
                onChange={(e) => setField("spareParts", e.target.value)}
                placeholder="Thermostat, Cables..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
              />
            </div>
          </div>

          <div className="max-w-xs">
            <label className={labelClass}>People Involved</label>
            <div className="relative">
              <input
                type="text"
                value={form.technician}
                onChange={(e) => setField("technician", e.target.value)}
                placeholder="Technician 1"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
              />
              <Server className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
            </div>
          </div>
        </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function UpdateAssetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetId = searchParams.get("assetId");
  const isEditMode = Boolean(assetId);

  const [activeMode, setActiveMode] = useState<"form" | "csv">("form");
  const [step, setStep] = useState<1 | 2>(1);
  const [drafts, setDrafts] = useState<AssetDraft[]>([]);
  const [form, setForm] = useState<AssetDraft>(emptyDraft());
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const [dbOptions, setDbOptions] = useState<DropdownOptions>({
    tipe: [], kategori: [], subKategori: [], merek: [], lokasiGedung: [], lokasiLantai: [],
  });
  const [localOptions, setLocalOptions] = useState<DropdownOptions>({
    tipe: [], kategori: [], subKategori: [], merek: [], lokasiGedung: [], lokasiLantai: [],
  });

  const [nameCheck, setNameCheck] = useState<{ nextId: number; nameExists: boolean } | null>(null);
  const [nameCheckLoading, setNameCheckLoading] = useState(false);

  const [showIncomplete, setShowIncomplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showDeleteDraft, setShowDeleteDraft] = useState<string | null>(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loadingAsset, setLoadingAsset] = useState(isEditMode);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function isFormDirty(): boolean {
    if (drafts.length > 0) return true;
    const e = emptyDraft();
    return (
      form.namaPrefix !== e.namaPrefix ||
      form.assetModel !== e.assetModel ||
      form.tipe !== e.tipe ||
      form.kategori !== e.kategori ||
      form.subKategori !== e.subKategori ||
      form.merek !== e.merek ||
      form.tglInstalasi !== e.tglInstalasi ||
      form.kekritisan !== e.kekritisan ||
      form.frequency !== e.frequency ||
      form.lokasiGedung !== e.lokasiGedung ||
      form.lokasiLantai !== e.lokasiLantai ||
      form.lokasiZona !== e.lokasiZona
    );
  }

  function handleBackToAssets() {
    if (isFormDirty()) {
      setShowLeaveWarning(true);
    } else {
      router.push("/assets");
    }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  function setField<K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addLocalOption(field: keyof DropdownOptions, v: string) {
    setLocalOptions((o) => ({ ...o, [field]: [...o[field], v] }));
  }

  // Fetch filter options
  useEffect(() => {
    fetch("/api/assets/filters")
      .then((r) => r.json())
      .then((data) => {
        setDbOptions({
          tipe: data.tipe ?? [],
          kategori: data.kategori ?? [],
          subKategori: data.subKategori ?? [],
          merek: data.merek ?? [],
          lokasiGedung: data.lokasi ?? [],
          lokasiLantai: data.lokasiLantai ?? [],
        });
      })
      .catch(() => {});
  }, []);

  // Load asset for edit mode
  useEffect(() => {
    if (!assetId) return;
    async function load() {
      setLoadingAsset(true);
      try {
        const [assetRes, komplainRes] = await Promise.all([
          fetch(`/api/assets/${encodeURIComponent(assetId!)}`),
          fetch(`/api/assets/${encodeURIComponent(assetId!)}/komplain`),
        ]);
        if (!assetRes.ok) throw new Error("Not found");
        const a = await assetRes.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logs: any[] = komplainRes.ok ? ((await komplainRes.json()).data ?? []) : [];
        const latest = logs
          .filter((l) => l.tanggalPengerjaan)
          .sort((x, y) => new Date(y.tanggalPengerjaan).getTime() - new Date(x.tanggalPengerjaan).getTime())[0] ?? null;

        const freqFromDb: Record<string, string> = {
          Harian: "Daily", Mingguan: "Weekly", Bulanan: "Monthly", Tahunan: "Yearly", Reactive: "Reactive",
        };
        const toDate = (v: string | null | undefined) => (v ? v.substring(0, 10) : "");

        // Parse prefix from full name (everything before last -XXXX segment)
        const nameParts = (a.nama ?? "").split("-");
        const prefix = nameParts.length > 1 ? nameParts.slice(0, -1).join("-") : (a.nama ?? "");
        const idNum = parseInt(a.idAset ?? "0", 10);

        const sevMap: Record<string, string> = {
          Fatal: "Fatal", Berat: "Serious", Sedang: "Sedang", Ringan: "Ringan",
        };

        const draft: AssetDraft = {
          draftId: "edit",
          namaPrefix: prefix,
          nextIdAset: idNum,
          assetModel: a.model ?? "",
          assetStatus: (["Aktif", "Rusak", "Diganti"].includes(a.status) ? a.status : "Aktif") as AssetDraft["assetStatus"],
          tipe: a.tipe ?? "",
          kategori: a.kategori ?? "",
          subKategori: a.subKategori ?? "",
          merek: a.merek ?? "",
          tglInstalasi: toDate(a.tglInstalasi),
          kekritisan: (["Critical", "Major", "Minor"].includes(a.kekritisan) ? a.kekritisan : "") as AssetDraft["kekritisan"],
          frequency: (freqFromDb[a.statusJadwal ?? ""] ?? "") as AssetDraft["frequency"],
          lokasiGedung: a.lokasiGedung ?? "",
          lokasiLantai: a.lokasiLantai ?? "",
          lokasiZona: (["Timur", "Barat", "Utara", "Selatan"].includes(a.lokasiZona) ? a.lokasiZona : "") as AssetDraft["lokasiZona"],
          logType: latest ? "repair" : "",
          lastPlanned: toDate(latest?.tanggalPerencanaan),
          lastExecFrom: toDate(latest?.tanggalPengerjaan),
          lastExecTo: toDate(latest?.tanggalSelesai),
          damageDesc: latest?.jenisKerusakan ?? "",
          damageCause: latest?.penyebab ?? "",
          severity: (sevMap[latest?.severity ?? ""] ?? "") as AssetDraft["severity"],
          repairCost: latest?.biayaPerbaikan != null ? String(Math.round(latest.biayaPerbaikan)) : "",
          spareParts: latest?.sparePartDigunakan ?? "",
          technician: latest?.teknisiPelaksana ?? "",
        };
        setForm(draft);
        setDrafts([draft]);
        setActiveDraftId("edit");
      } catch {
        showToast("Failed to load asset", false);
      } finally {
        setLoadingAsset(false);
      }
    }
    load();
  }, [assetId]);

  // Debounced name check — all setState calls are inside the async callback to avoid
  // synchronous setState-in-effect lint errors.
  const nameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current);

    const delay = form.namaPrefix.trim() ? 400 : 0;
    nameCheckTimer.current = setTimeout(async () => {
      if (!form.namaPrefix.trim()) {
        setNameCheck(null);
        setNameCheckLoading(false);
        return;
      }
      setNameCheckLoading(true);
      try {
        const res = await fetch(`/api/assets/name-check?prefix=${encodeURIComponent(form.namaPrefix)}`);
        const data = await res.json();
        setNameCheck(data);
        setField("nextIdAset", data.nextId);
      } catch {
        // ignore
      } finally {
        setNameCheckLoading(false);
      }
    }, delay);
    return () => { if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current); };
  }, [form.namaPrefix]);

  function validateStep1(): string[] {
    const missing: string[] = [];
    for (const { key, label } of STEP1_REQUIRED) {
      if (!form[key]) missing.push(label);
    }
    if (nameCheck?.nameExists) missing.push("Asset Name (already existed)");
    return missing;
  }

  function handleNext() {
    const missing = validateStep1();
    if (missing.length > 0) {
      setMissingFields(missing);
      setShowIncomplete(true);
      return;
    }
    setStep(2);
  }

  function saveDraft() {
    const saved = { ...form };
    if (activeDraftId) {
      setDrafts((d) => d.map((x) => (x.draftId === activeDraftId ? { ...saved, draftId: activeDraftId } : x)));
      showToast("Asset updated in list", true);
    } else {
      const newDraft = { ...saved, draftId: crypto.randomUUID() };
      setDrafts((d) => [...d, newDraft]);
      setActiveDraftId(newDraft.draftId);
      showToast(`"${form.namaPrefix || "Asset"}" saved to list`, true);
    }
    // Reset for new form
    setForm(emptyDraft());
    setActiveDraftId(null);
    setStep(1);
    setNameCheck(null);
  }

  function loadDraft(d: AssetDraft) {
    setForm(d);
    setActiveDraftId(d.draftId);
    setStep(1);
  }

  function deleteDraftById(id: string) {
    setDrafts((d) => d.filter((x) => x.draftId !== id));
    if (activeDraftId === id) {
      setForm(emptyDraft());
      setActiveDraftId(null);
      setStep(1);
      setNameCheck(null);
    }
    setShowDeleteDraft(null);
  }

  const submitAll = useCallback(async () => {
    const toSubmit = isEditMode ? [form] : (drafts.length > 0 ? drafts : [{ ...form, draftId: "tmp" }]);
    setSubmitting(true);

    // Fetch MAX idAset once, then assign sequential IDs to each draft
    let baseId: number;
    try {
      const r = await fetch("/api/assets/name-check?prefix=__NOCHECK__");
      const d = await r.json();
      baseId = d.nextId as number;
    } catch {
      baseId = 1;
    }

    let ok = 0;
    let fail = 0;

    for (let i = 0; i < toSubmit.length; i++) {
      const d = toSubmit[i];
      const assignedId = isEditMode ? (d.nextIdAset ?? baseId) : (d.nextIdAset ?? baseId + i);
      const fullName = formatAssetName(d.namaPrefix, assignedId);

      try {
        const method = isEditMode ? "PUT" : "POST";
        const url = isEditMode
          ? `/api/assets/${encodeURIComponent(String(assignedId))}`
          : "/api/assets";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idAset: assignedId,
            nama: fullName,
            merek: d.merek || null,
            model: d.assetModel || null,
            kategori: d.kategori || null,
            subKategori: d.subKategori || null,
            tipe: d.tipe || null,
            tglInstalasi: d.tglInstalasi || null,
            lokasiGedung: d.lokasiGedung || null,
            lokasiLantai: d.lokasiLantai || null,
            lokasiZona: d.lokasiZona || null,
            kekritisan: d.kekritisan || null,
            status: d.assetStatus,
            statusJadwal: d.frequency ? freqToJadwal(d.frequency) : null,
          }),
        });

        if (res.ok) {
          ok++;
          const hasRepair = !!(d.lastPlanned || d.lastExecFrom || d.damageDesc || d.repairCost || d.severity);
          if (hasRepair) {
            await fetch(`/api/assets/${encodeURIComponent(String(assignedId))}/komplain`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tanggalPerencanaan: d.lastPlanned || null,
                tanggalPengerjaan: d.lastExecFrom || null,
                tanggalSelesai: d.lastExecTo || null,
                jenisKerusakan: d.damageDesc || null,
                penyebab: d.damageCause || null,
                severity: d.severity ? severityToDb(d.severity) : null,
                biayaPerbaikan: d.repairCost ? Number(d.repairCost) : null,
                sparePartDigunakan: d.spareParts || null,
                teknisiPelaksana: d.technician || null,
              }),
            });
          }
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }

    setSubmitting(false);
    if (ok > 0) {
      showToast(`${ok} asset(s) submitted successfully${fail > 0 ? `, ${fail} failed` : ""}`, true);
      setTimeout(() => router.push("/assets"), 1500);
    } else {
      showToast(`Submission failed (${fail} error${fail > 1 ? "s" : ""})`, false);
    }
  }, [isEditMode, form, drafts, router]);

  if (loadingAsset) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  const totalDrafts = drafts.length + (activeDraftId ? 0 : 1);

  return (
    <div className="flex flex-col h-full relative">
      {/* Modals */}
      {showIncomplete && (
        <IncompleteWarningModal
          missingFields={missingFields}
          onContinue={() => setShowIncomplete(false)}
          onClose={() => setShowIncomplete(false)}
        />
      )}
      {showDeleteDraft && (
        <DeleteDraftModal
          onConfirm={() => deleteDraftById(showDeleteDraft)}
          onCancel={() => setShowDeleteDraft(null)}
        />
      )}
      {showLeaveWarning && (
        <LeavePageWarningModal
          onLeave={() => router.push("/assets")}
          onStay={() => setShowLeaveWarning(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg transition-all duration-300 ${
          toast.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-6 shrink-0">
        <div>
          <button
            onClick={handleBackToAssets}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-indigo-600 transition-colors duration-150 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Assets
          </button>
          <h1 className="text-xl font-semibold text-zinc-900">Update Asset(s)</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Enter asset details manually OR import multiple assets using a CSV file.
          </p>
        </div>

        {/* Form / CSV toggle */}
        <div className={`relative flex rounded-xl border border-zinc-200 bg-zinc-100 overflow-hidden text-sm ${isEditMode ? "opacity-60 pointer-events-none" : ""}`}>
          <div className={`absolute inset-y-0 w-1/2 bg-white rounded-lg shadow-sm border border-zinc-200 transition-transform duration-200 ${activeMode === "csv" ? "translate-x-full" : "translate-x-0"}`} />
          <button onClick={() => setActiveMode("form")} className={`relative z-10 px-5 py-2 font-medium transition-colors duration-150 ${activeMode === "form" ? "text-zinc-900" : "text-zinc-500"}`}>Form</button>
          <button onClick={() => setActiveMode("csv")} className={`relative z-10 px-5 py-2 font-medium transition-colors duration-150 ${activeMode === "csv" ? "text-zinc-900" : "text-zinc-500"}`}>CSV</button>
        </div>
      </div>

      {activeMode === "csv" ? (
        <CsvPanel onSubmitSuccess={(n) => showToast(`${n} asset(s) imported`, true)} />
      ) : (
        <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
          {/* Left panel: saved drafts */}
          <div className="w-48 xl:w-52 shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
            {!isEditMode && (
              <button
                onClick={() => { setForm(emptyDraft()); setActiveDraftId(null); setStep(1); setNameCheck(null); }}
                className="shrink-0 flex items-center justify-center gap-1.5 w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-sm active:scale-[0.98] transition-all duration-150"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Form
              </button>
            )}

            {drafts.length === 0 && !activeDraftId ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-center">
                <p className="text-xs text-zinc-400">No saved assets yet.</p>
                <p className="text-[11px] text-zinc-300 mt-1">Click &ldquo;Save Asset&rdquo; to add.</p>
              </div>
            ) : (
              drafts.map((d) => (
                <DraftCard
                  key={d.draftId}
                  draft={d}
                  active={activeDraftId === d.draftId}
                  onEdit={() => loadDraft(d)}
                  onDelete={() => setShowDeleteDraft(d.draftId)}
                />
              ))
            )}
          </div>

          {/* Right: form card */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl border border-zinc-200 shadow-sm">
            <StepIndicator step={step} onBack={() => setStep(1)} />

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {step === 1 ? (
                <AssetInfoStep
                  form={form}
                  setField={setField}
                  dbOptions={dbOptions}
                  localOptions={localOptions}
                  addLocalOption={addLocalOption}
                  nameCheck={nameCheck}
                  nameCheckLoading={nameCheckLoading}
                />
              ) : (
                <MaintenanceHistoryStep form={form} setField={setField} />
              )}
            </div>

            {/* Action buttons */}
            <div className="shrink-0 border-t border-zinc-100 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => {
                  if (step === 2 && !isEditMode) { setStep(1); return; }
                  setShowDeleteDraft(activeDraftId ?? "__current__");
                }}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-100 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
              >
                <Trash2 className="w-4 h-4" />
                Delete Asset
              </button>

              <div className="flex items-center gap-3">
                {step === 1 && (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-150"
                  >
                    Next
                  </button>
                )}

                {step === 2 && (
                  <>
                    {!isEditMode && (
                      <button
                        onClick={saveDraft}
                        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 shadow-sm"
                      >
                        <Save className="w-4 h-4" />
                        Save Asset
                      </button>
                    )}

                    <button
                      onClick={submitAll}
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                      {submitting
                        ? "Submitting…"
                        : isEditMode
                        ? "Update Asset"
                        : `Submit ${totalDrafts} Asset(s)`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UpdateAssetsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>}>
      <UpdateAssetsContent />
    </Suspense>
  );
}
