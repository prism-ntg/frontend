"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSpreadsheet, Trash2, Save, Upload, ChevronDown,
  Loader2, X, CheckCircle, AlertCircle, Pencil, Copy, Plus, ArrowLeft,
} from "lucide-react";

// Types                                                                     

interface AssetDraft {
  draftId: string;
  idAset: string;
  nama: string;
  currentStatus: "Healthy" | "At Risk" | "Critical";
  tipe: string;
  kategori: string;
  tglInstalasi: string;
  lokasiGedung: string;
  lokasiLantai: string;
  lokasiZona: "Timur" | "Barat" | "Utara" | "Selatan" | "";
  maintenanceType: "Preventive" | "Repair" | "Replace" | "";
  frequency: "Daily" | "Weekly" | "Monthly" | "Yearly" | "Reactive" | "";
  lastPlanned: string;
  lastExecution: string;
  lastDone: string;
  repairCost: string;
  replacementCost: string;
  description: string;
}

// Helpers                                                                   

function genId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PRISM-${rand(4)}-${rand(4)}`;
}

function emptyDraft(): AssetDraft {
  return {
    draftId: crypto.randomUUID(),
    idAset: genId(),
    nama: "",
    currentStatus: "Healthy",
    tipe: "",
    kategori: "",
    tglInstalasi: "",
    lokasiGedung: "Gedung A",
    lokasiLantai: "",
    lokasiZona: "Barat",
    maintenanceType: "",
    frequency: "",
    lastPlanned: "",
    lastExecution: "",
    lastDone: "",
    repairCost: "",
    replacementCost: "",
    description: "",
  };
}

function freqToJadwal(f: string): string {
  const map: Record<string, string> = {
    Daily: "Harian",
    Weekly: "Mingguan",
    Monthly: "Bulanan",
    Yearly: "Tahunan",
    Reactive: "Reactive",
  };
  return map[f] ?? f;
}

function statusToKekritisan(s: string): string | null {
  if (s === "Critical") return "Critical";
  if (s === "At Risk") return "Major";
  return null;
}

// Small shared components                                                   

function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: T[];
  value: T | "";
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
            value === opt
              ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
              : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
          } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
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
      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all disabled:opacity-50"
    />
  );
}

function formatRupiah(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return "Rp" + Number(digits).toLocaleString("id-ID");
}

function CurrencyField({
  value,
  onChange,
  placeholder = "Rp 0",
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
      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all disabled:opacity-50"
    />
  );
}

// Saved Asset Card                                                          

function DraftCard({
  draft,
  active,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  draft: AssetDraft;
  active: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-all duration-200 ${
        active
          ? "border-indigo-300 bg-indigo-50/60 shadow-sm"
          : "border-zinc-200 bg-white hover:border-indigo-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <FileSpreadsheet className="w-4 h-4 text-zinc-400 shrink-0" />
        <p className="text-sm font-medium text-zinc-700 truncate">
          {draft.nama || "Unnamed Asset"}
        </p>
      </div>
      <p className="text-[11px] text-zinc-400 font-mono mb-2">{draft.idAset}</p>
      <div className={`h-0.5 rounded-full mb-3 ${
        draft.currentStatus === "Critical" ? "bg-red-500" : draft.currentStatus === "At Risk" ? "bg-yellow-400" : "bg-green-500"
      }`} />
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-600 transition-colors active:scale-95"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={onDuplicate}
          title="Duplicate"
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors active:scale-95"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="ml-auto flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-500 hover:bg-red-100 transition-all duration-150 active:scale-95"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

// CSV Upload Panel                                                          

const REQUIRED_COLS = [
  "ID_Aset", "Kategori", "Sub_Kategori", "Tipe", "Lokasi",
  "Tanggal_Instalasi", "Tingkat_Kekritisan", "Biaya_Perbaikan",
  "Biaya_Penggantian", "Jenis_Kerusakan", "Tanggal_Perbaikan",
];

function CsvPanel({
  onSubmitSuccess,
}: {
  onSubmitSuccess: (count: number) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".xlsx"))) setFile(f);
  }

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
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-6 md:p-8">
        <h2 className="text-base font-semibold text-zinc-800 mb-4">Import Data</h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-16 mb-6 ${
            dragging
              ? "border-green-400 bg-green-50"
              : file
              ? "border-green-400 bg-green-50/60"
              : "border-green-300 bg-green-50/40 hover:bg-green-50 hover:border-green-400"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-8 h-8 text-green-600" />
          </div>
          {file ? (
            <div className="text-center">
              <p className="text-sm font-medium text-green-700">{file.name}</p>
              <p className="text-xs text-green-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                Import CSV or XLSX File
                <Upload className="w-4 h-4" />
              </p>
              <p className="text-xs text-green-500 mt-1">Drag & drop or click to browse</p>
            </div>
          )}
          {file && (
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="absolute top-3 right-3 p-1 rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Required columns */}
        <div>
          <p className="text-sm font-medium text-zinc-700 mb-3">
            Required Columns{" "}
            <span className="text-zinc-400 font-normal">({REQUIRED_COLS.length})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_COLS.map((col) => (
              <span
                key={col}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600"
              >
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-4 rounded-xl border p-4 ${result.errors.length === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div className="flex items-center gap-2 mb-1">
              {result.errors.length === 0
                ? <CheckCircle className="w-4 h-4 text-green-600" />
                : <AlertCircle className="w-4 h-4 text-yellow-600" />}
              <p className="text-sm font-medium text-zinc-700">
                {result.created} asset(s) imported successfully
              </p>
            </div>
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-yellow-700 mt-1">{e}</p>
            ))}
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="shrink-0 border-t border-zinc-100 px-6 py-4 flex items-center justify-between bg-white">
        <button
          disabled
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-400 opacity-50 cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Delete Asset
        </button>
        <button
          onClick={handleSubmit}
          disabled={!file || submitting}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          {submitting ? "Importing…" : "Submit Asset(s)"}
        </button>
      </div>
    </div>
  );
}

// Delete Confirmation Modal

function DeleteConfirmModal({
  assetId,
  onConfirm,
  onCancel,
  loading,
}: {
  assetId: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={!loading ? onCancel : undefined}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transition-all duration-200 ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"}`}>
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Delete Asset</h3>
          <p className="text-sm text-zinc-400 mb-4">This action cannot be undone.</p>
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-2.5 w-full">
            <p className="text-sm font-mono text-zinc-700">{assetId}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main page (wrapped content)

function UpdateAssetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetId = searchParams.get("assetId");
  const isEditMode = Boolean(assetId);

  const [activeMode, setActiveMode] = useState<"form" | "csv">("form");
  const [drafts, setDrafts] = useState<AssetDraft[]>([]);
  const [form, setForm] = useState<AssetDraft>(emptyDraft());
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(false);

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

        const freqMap: Record<string, string> = {
          Harian: "Daily", Mingguan: "Weekly", Bulanan: "Monthly", Tahunan: "Yearly",
        };
        const toDate = (v: string | null | undefined) => (v ? v.substring(0, 10) : "");
        const draft: AssetDraft = {
          draftId: "edit",
          idAset: a.idAset ?? "",
          nama: a.nama ?? "",
          currentStatus: a.kekritisan === "Critical" ? "Critical" : a.kekritisan === "Major" ? "At Risk" : "Healthy",
          tipe: a.tipe ?? "",
          kategori: a.kategori ?? "",
          tglInstalasi: toDate(a.tglInstalasi),
          lokasiGedung: a.lokasiGedung ?? "Gedung A",
          lokasiLantai: a.lokasiLantai ?? "",
          lokasiZona: (["Timur", "Barat", "Utara", "Selatan"].includes(a.lokasiZona) ? a.lokasiZona : "Barat") as AssetDraft["lokasiZona"],
          maintenanceType: "",
          frequency: (freqMap[a.statusJadwal ?? ""] ?? "") as AssetDraft["frequency"],
          lastPlanned: toDate(latest?.tanggalPerencanaan),
          lastExecution: toDate(latest?.tanggalPengerjaan),
          lastDone: toDate(latest?.tanggalSelesai),
          repairCost: latest?.biayaPerbaikan != null ? String(Math.round(latest.biayaPerbaikan)) : "",
          replacementCost: "",
          description: latest?.jenisKerusakan ?? "",
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

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  function setField<K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function saveDraft() {
    if (activeDraftId) {
      setDrafts((d) => d.map((x) => (x.draftId === activeDraftId ? { ...form, draftId: activeDraftId } : x)));
    } else {
      const saved = { ...form, draftId: crypto.randomUUID() };
      setDrafts((d) => [...d, saved]);
      setActiveDraftId(saved.draftId);
    }
    showToast(`"${form.nama || form.idAset}" saved to list`, true);
  }

  function loadDraft(d: AssetDraft) {
    setForm(d);
    setActiveDraftId(d.draftId);
  }

  function duplicateDraft(d: AssetDraft) {
    const copy = { ...d, draftId: crypto.randomUUID(), idAset: genId() };
    setDrafts((prev) => [...prev, copy]);
  }

  function deleteDraft(id: string) {
    setDrafts((d) => d.filter((x) => x.draftId !== id));
    if (activeDraftId === id) {
      setActiveDraftId(null);
      setForm(emptyDraft());
    }
  }

  async function submitAll() {
    const toSubmit = isEditMode ? [form] : (drafts.length > 0 ? drafts : [{ ...form, draftId: "tmp" }]);
    setSubmitting(true);
    let ok = 0;
    let fail = 0;
    for (const d of toSubmit) {
      try {
        const method = isEditMode ? "PUT" : "POST";
        const url = isEditMode
          ? `/api/assets/${encodeURIComponent(d.idAset)}`
          : "/api/assets";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idAset: d.idAset,
            nama: d.nama,
            kategori: d.kategori,
            tipe: d.tipe,
            tglInstalasi: d.tglInstalasi || null,
            lokasiGedung: d.lokasiGedung,
            lokasiLantai: d.lokasiLantai,
            lokasiZona: d.lokasiZona,
            kekritisan: statusToKekritisan(d.currentStatus),
            statusJadwal: d.frequency ? freqToJadwal(d.frequency) : null,
          }),
        });
        if (res.ok) {
          ok++;
          const hasMaintenanceData = d.lastPlanned || d.lastExecution || d.lastDone || d.repairCost || d.description || d.maintenanceType;
          if (hasMaintenanceData) {
            await fetch(`/api/assets/${encodeURIComponent(d.idAset)}/komplain`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tanggalPerencanaan: d.lastPlanned || null,
                tanggalPengerjaan: d.lastExecution || null,
                tanggalSelesai: d.lastDone || null,
                jenisKerusakan: d.maintenanceType || null,
                penyebab: d.description || null,
                biayaPerbaikan: d.repairCost ? Number(d.repairCost) : null,
              }),
            });
          }
        } else {
          fail++;
        }
      } catch { fail++; }
    }
    setSubmitting(false);
    if (ok > 0) {
      showToast(`${ok} asset(s) submitted successfully${fail > 0 ? `, ${fail} failed` : ""}`, true);
      setTimeout(() => router.push("/assets"), 1500);
    } else {
      showToast(`Submission failed (${fail} error${fail > 1 ? "s" : ""})`, false);
    }
  }

  function deleteAsset() {
    if (!isEditMode || !assetId) return;
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    setDeletingAsset(true);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(assetId!)}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Asset deleted", true);
        setTimeout(() => router.push("/assets"), 1200);
      } else {
        showToast("Delete failed", false);
      }
    } finally {
      setDeletingAsset(false);
      setShowDeleteConfirm(false);
    }
  }

  const BUILDINGS = ["Gedung A", "Gedung B", "Gedung C", "Gedung D", "Gedung E", "Gedung Parkir", "Gedung Servis", "Gedung Utama"];
  const BLOCK_NUMBERS = Array.from({ length: 20 }, (_, i) => String(i + 1));

  if (loadingAsset) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          assetId={assetId!}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deletingAsset}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg transition-all duration-300 ${
            toast.ok
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {toast.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-6 shrink-0">
        <div>
          <button
            onClick={() => router.push("/assets")}
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
        <div
          className={`relative flex rounded-xl border border-zinc-200 bg-zinc-100 overflow-hidden text-sm ${isEditMode ? "opacity-60 cursor-not-allowed" : ""}`}
          title={isEditMode ? "Toggle disabled in edit mode" : undefined}
        >
          <div
            className={`absolute inset-y-0 w-1/2 bg-white rounded-lg shadow-sm border border-zinc-200 transition-transform duration-200 ${activeMode === "csv" ? "translate-x-full" : "translate-x-0"}`}
          />
          <button
            onClick={() => !isEditMode && setActiveMode("form")}
            disabled={isEditMode}
            className={`relative z-10 px-5 py-2 font-medium transition-colors duration-150 ${activeMode === "form" ? "text-zinc-900" : "text-zinc-500"}`}
          >
            Form
          </button>
          <button
            onClick={() => !isEditMode && setActiveMode("csv")}
            disabled={isEditMode}
            className={`relative z-10 px-5 py-2 font-medium transition-colors duration-150 ${activeMode === "csv" ? "text-zinc-900" : "text-zinc-500"}`}
          >
            CSV
          </button>
        </div>
      </div>

      {activeMode === "csv" ? (
        <CsvPanel onSubmitSuccess={(n) => showToast(`${n} asset(s) imported`, true)} />
      ) : (
        <div className="flex gap-5 flex-1 overflow-hidden min-h-0">
          {/* Left: Saved drafts list */}
          <div className="w-52 xl:w-60 shrink-0 flex flex-col">
            {drafts.length > 0 && !isEditMode && (
              <button
                onClick={() => { setForm(emptyDraft()); setActiveDraftId(null); }}
                className="shrink-0 mb-3 flex items-center justify-center gap-1.5 w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-sm active:scale-[0.98] active:shadow-none transition-all duration-150"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Form
              </button>
            )}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {drafts.length === 0 ? (
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
                    onDuplicate={() => duplicateDraft(d)}
                    onDelete={() => deleteDraft(d.draftId)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: Form */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1">
              {/* Asset Information */}
              <section className="mb-8">
                <h2 className="text-base font-semibold text-zinc-800 mb-5">Asset Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {/* Asset Name */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Asset Name</label>
                    <input
                      type="text"
                      value={form.nama}
                      onChange={(e) => setField("nama", e.target.value)}
                      placeholder="e.g. Air Conditioner"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    />
                  </div>

                  {/* Asset ID */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Asset ID</label>
                    <input
                      type="text"
                      value={form.idAset}
                      onChange={(e) => !isEditMode && setField("idAset", e.target.value)}
                      readOnly={isEditMode}
                      className={`w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-mono text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all ${isEditMode ? "opacity-60 cursor-not-allowed" : ""}`}
                    />
                  </div>

                  {/* Current Status */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Current Status</label>
                    <RadioGroup<"Healthy" | "At Risk" | "Critical">
                      options={["Healthy", "At Risk", "Critical"]}
                      value={form.currentStatus}
                      onChange={(v) => setField("currentStatus", v)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {/* Asset Type */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Asset Type</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.tipe}
                        onChange={(e) => setField("tipe", e.target.value)}
                        placeholder="e.g. Air Conditioner"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Category</label>
                    <input
                      type="text"
                      value={form.kategori}
                      onChange={(e) => setField("kategori", e.target.value)}
                      placeholder="e.g. Mechanical"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    />
                  </div>

                  {/* Installation Date */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Installation Date</label>
                    <DateField value={form.tglInstalasi} onChange={(v) => setField("tglInstalasi", v)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Building */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Building</label>
                    <SelectField
                      value={form.lokasiGedung}
                      onChange={(v) => setField("lokasiGedung", v)}
                      options={BUILDINGS}
                      placeholder="Select building"
                    />
                  </div>

                  {/* Block Number */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Block Number</label>
                    <SelectField
                      value={form.lokasiLantai}
                      onChange={(v) => setField("lokasiLantai", v)}
                      options={BLOCK_NUMBERS}
                      placeholder="Select block"
                    />
                  </div>

                  {/* Zone */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Zone</label>
                    <RadioGroup<"Timur" | "Barat" | "Utara" | "Selatan">
                      options={["Timur", "Barat", "Utara", "Selatan"]}
                      value={form.lokasiZona}
                      onChange={(v) => setField("lokasiZona", v)}
                    />
                  </div>
                </div>
              </section>

              {/* Latest Maintenance History */}
              <section>
                <h2 className="text-base font-semibold text-zinc-800 mb-5">Latest Maintenance History</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Maintenance Type</label>
                    <RadioGroup<"Preventive" | "Repair" | "Replace">
                      options={["Preventive", "Repair", "Replace"]}
                      value={form.maintenanceType}
                      onChange={(v) => setField("maintenanceType", v)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Frequency</label>
                    <RadioGroup<"Daily" | "Weekly" | "Monthly" | "Yearly" | "Reactive">
                      options={["Daily", "Weekly", "Monthly", "Yearly", "Reactive"]}
                      value={form.frequency}
                      onChange={(v) => setField("frequency", v)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Last Planned Maintenance</label>
                    <DateField value={form.lastPlanned} onChange={(v) => setField("lastPlanned", v)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Last Maintenance Execution</label>
                    <DateField value={form.lastExecution} onChange={(v) => setField("lastExecution", v)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Last Done Maintenance</label>
                    <DateField value={form.lastDone} onChange={(v) => setField("lastDone", v)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Repair Cost</label>
                    <CurrencyField
                      value={form.repairCost}
                      onChange={(v) => setField("repairCost", v)}
                      placeholder="Rp 0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">Replacement Cost</label>
                    <CurrencyField
                      value={form.replacementCost}
                      onChange={(v) => setField("replacementCost", v)}
                      placeholder="Rp 0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Broken inner fan..."
                    rows={4}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all resize-none"
                  />
                </div>
              </section>
            </div>

            {/* Action Buttons */}
            <div className="shrink-0 border-t border-zinc-100 pt-4 mt-4 flex items-center justify-between">
              <button
                onClick={isEditMode ? deleteAsset : () => { setForm(emptyDraft()); setActiveDraftId(null); }}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-100 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
              >
                <Trash2 className="w-4 h-4" />
                {isEditMode ? "Delete Asset" : "Clear Form"}
              </button>

              <div className="flex items-center gap-3">
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
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <FileSpreadsheet className="w-4 h-4" />}
                  {submitting
                    ? "Submitting…"
                    : isEditMode
                    ? "Update Asset"
                    : `Submit ${drafts.length || 1} Asset(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Page export (Suspense wrapper required for useSearchParams)                

export default function UpdateAssetsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      }
    >
      <UpdateAssetsContent />
    </Suspense>
  );
}
