"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Save, Calendar, Tag } from "lucide-react";

interface Ticket {
  id: number;
  idAset: number;
  nama: string | null;
  lokasiGedung: string | null;
  lokasiLantai: string | null;
  lokasiZona: string | null;
  kategori: string | null;
  subKategori: string | null;
  tipe: string | null;
  merek: string | null;
  tanggalPerencanaan: string | null;
  tanggalPengerjaan: string | null;
  tanggalSelesai: string | null;
  jenisKerusakan: string | null;
  severity: string | null;
  penyebab: string | null;
  biayaPerbaikan: number | null;
  sparePartDigunakan: string | null;
  teknisiPelaksana: string | null;
  ticketStatus: string | null;
}

interface WorkForm {
  tanggalPengerjaan: string;
  tanggalSelesai: string;
  jenisKerusakan: string;
  severity: string;
  penyebab: string;
  biayaPerbaikan: string;
  sparePartDigunakan: string;
  teknisiPelaksana: string;
}

const SEVERITY_OPTIONS: { value: string; label: string; active: string }[] = [
  { value: "Fatal",   label: "Fatal",   active: "border-red-400 bg-red-50 text-red-600 shadow-sm"       },
  { value: "Serious", label: "Serious", active: "border-orange-300 bg-orange-50 text-orange-600 shadow-sm" },
  { value: "Sedang",  label: "Medium",  active: "border-yellow-300 bg-yellow-50 text-yellow-600 shadow-sm" },
  { value: "Ringan",  label: "Mild",    active: "border-green-400 bg-green-50 text-green-600 shadow-sm"   },
];

const SEV_DB_TO_FORM: Record<string, string> = { Berat: "Serious" };
const SEV_FORM_TO_DB: Record<string, string> = { Serious: "Berat" };

function sevToForm(db: string | null) { return db ? (SEV_DB_TO_FORM[db] ?? db) : ""; }
function sevToDb(form: string)        { return SEV_FORM_TO_DB[form] ?? form; }

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open:        { label: "New",         cls: "bg-blue-50 text-blue-600 border-blue-200"  },
  in_progress: { label: "In Progress", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  completed:   { label: "Completed",   cls: "bg-green-50 text-green-600 border-green-200" },
};

function StatusBadge({ status }: { status: string | null }) {
  const m = STATUS_MAP[status ?? ""] ?? { label: status ?? "—", cls: "bg-slate-50 text-slate-500 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${m.cls}`}>
      {m.label}
    </span>
  );
}

const inputBase = "w-full rounded-lg border px-3 py-2.5 text-sm text-slate-700 focus:outline-none transition-[border-color,box-shadow] bg-white";
const inputCls  = `${inputBase} border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100`;
const inputErr  = `${inputBase} border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100`;
const labelCls  = "block text-xs font-medium text-slate-600 mb-1.5";

function InfoPill({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value ?? "—"}</p>
    </div>
  );
}

const REQUIRED_FIELDS = ["tanggalSelesai", "jenisKerusakan", "severity", "biayaPerbaikan", "teknisiPelaksana"] as const;

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<WorkForm>({
    tanggalPengerjaan: "", tanggalSelesai: "", jenisKerusakan: "", severity: "",
    penyebab: "", biayaPerbaikan: "", sparePartDigunakan: "", teknisiPelaksana: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  function clearError(field: string) {
    setFieldErrors(prev => { const n = new Set(prev); n.delete(field); return n; });
  }

  function field(name: string) {
    return fieldErrors.has(name) ? inputErr : inputCls;
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.status === 403 || res.status === 404) { router.push("/technician/tickets"); return; }
      const json = await res.json();
      const t: Ticket = json.data;
      setTicket(t);
      setForm({
        tanggalPengerjaan: t.tanggalPengerjaan ? t.tanggalPengerjaan.slice(0, 10) : "",
        tanggalSelesai:    t.tanggalSelesai    ? t.tanggalSelesai.slice(0, 10)    : "",
        jenisKerusakan:    t.jenisKerusakan    ?? "",
        severity:          sevToForm(t.severity),
        penyebab:          t.penyebab          ?? "",
        biayaPerbaikan:    t.biayaPerbaikan != null ? String(t.biayaPerbaikan) : "",
        sparePartDigunakan: t.sparePartDigunakan ?? "",
        teknisiPelaksana:  t.teknisiPelaksana  ?? "",
      });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);

  const isCompleted = ticket?.ticketStatus === "completed";

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          severity: sevToDb(form.severity),
          biayaPerbaikan: form.biayaPerbaikan ? Number(form.biayaPerbaikan.replace(/\D/g, "")) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast("Progress saved");
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    const errors = new Set(REQUIRED_FIELDS.filter(f => !form[f]));
    if (errors.size > 0) {
      setFieldErrors(errors);
      showToast("Please complete all required fields (*) before finishing", false);
      return;
    }
    setFieldErrors(new Set());
    setCompleting(true);
    try {
      const res = await fetch(`/api/tickets/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          severity: sevToDb(form.severity),
          biayaPerbaikan: Number(form.biayaPerbaikan.replace(/\D/g, "")),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast("Maintenance complete! Ticket closed.");
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to complete", false);
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-8 bg-slate-100 rounded w-1/4 motion-safe:animate-pulse" />
        <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3 motion-safe:animate-pulse">
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="flex gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-4 motion-safe:animate-pulse">
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-10 bg-slate-100 rounded-lg" />
          <div className="h-10 bg-slate-100 rounded-lg" />
        </div>
      </div>
    );
  }
  if (!ticket) return null;

  return (
    <div className="space-y-5 max-w-2xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-9999 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/technician/tickets")}
          aria-label="Back to tickets"
          className="p-2.5 min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Ticket #{ticket.id}</h1>
          <div className="mt-0.5"><StatusBadge status={ticket.ticketStatus} /></div>
        </div>
        {isCompleted && (
          <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs font-medium text-green-600">
            <CheckCircle className="w-3.5 h-3.5" /> Completed
          </span>
        )}
      </div>

      {/* Asset info card */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Asset Information</p>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">{ticket.nama ?? "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <InfoPill label="Building"     value={ticket.lokasiGedung} />
          <InfoPill label="Floor"        value={ticket.lokasiLantai} />
          <InfoPill label="Brand"        value={ticket.merek} />
          <InfoPill label="Category"     value={ticket.kategori} />
          <InfoPill label="Sub-Category" value={ticket.subKategori} />
          <InfoPill label="Type"         value={ticket.tipe} />
        </div>
        {ticket.tanggalPerencanaan && (
          <div className="flex items-center gap-2 text-[12px] text-indigo-500">
            <Calendar className="w-3.5 h-3.5" />
            Planned date: {new Date(ticket.tanggalPerencanaan).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
      </div>

      {/* Work form */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Work Details</p>
          <p className="text-[10px] text-slate-400">* Required fields</p>
        </div>

        {isCompleted && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-[12px] text-green-700">
            This ticket is completed. No further changes can be made.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Execution Date</label>
            <input
              type="date"
              value={form.tanggalPengerjaan}
              disabled={isCompleted}
              onChange={e => { clearError("tanggalPengerjaan"); setForm(f => ({ ...f, tanggalPengerjaan: e.target.value })); }}
              className={field("tanggalPengerjaan")}
            />
          </div>
          <div>
            <label className={labelCls}>Completion Date *</label>
            <input
              type="date"
              value={form.tanggalSelesai}
              disabled={isCompleted}
              onChange={e => { clearError("tanggalSelesai"); setForm(f => ({ ...f, tanggalSelesai: e.target.value })); }}
              className={field("tanggalSelesai")}
            />
            {fieldErrors.has("tanggalSelesai") && (
              <p className="text-[11px] text-red-500 mt-1">Completion date is required</p>
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>Damage Type *</label>
          <input
            type="text"
            value={form.jenisKerusakan}
            disabled={isCompleted}
            onChange={e => { clearError("jenisKerusakan"); setForm(f => ({ ...f, jenisKerusakan: e.target.value })); }}
            placeholder="Describe the type of damage"
            className={field("jenisKerusakan")}
          />
          {fieldErrors.has("jenisKerusakan") && (
            <p className="text-[11px] text-red-500 mt-1">Damage type is required</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Severity *</label>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map(({ value, label, active }) => (
              <button
                key={value}
                type="button"
                disabled={isCompleted}
                onClick={() => { clearError("severity"); setForm(f => ({ ...f, severity: value })); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 ${
                  form.severity === value
                    ? active
                    : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {fieldErrors.has("severity") && (
            <p className="text-[11px] text-red-500 mt-1">Severity is required</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Assigned Technician *</label>
          <input
            type="text"
            value={form.teknisiPelaksana}
            disabled={isCompleted}
            onChange={e => { clearError("teknisiPelaksana"); setForm(f => ({ ...f, teknisiPelaksana: e.target.value })); }}
            placeholder="Technician name"
            className={field("teknisiPelaksana")}
          />
          {fieldErrors.has("teknisiPelaksana") && (
            <p className="text-[11px] text-red-500 mt-1">Technician name is required</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Cause</label>
          <textarea
            value={form.penyebab}
            disabled={isCompleted}
            onChange={e => setForm(f => ({ ...f, penyebab: e.target.value }))}
            rows={3}
            placeholder="Describe the cause of damage"
            className={inputCls + " resize-none"}
          />
        </div>

        <div>
          <label className={labelCls}>Repair Cost *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium select-none pointer-events-none">Rp</span>
            <input
              type="text"
              value={form.biayaPerbaikan ? Number(form.biayaPerbaikan).toLocaleString("id-ID") : ""}
              disabled={isCompleted}
              onChange={e => {
                clearError("biayaPerbaikan");
                const digits = e.target.value.replace(/\D/g, "");
                setForm(f => ({ ...f, biayaPerbaikan: digits }));
              }}
              placeholder="0"
              className={`${field("biayaPerbaikan")} pl-9`}
            />
          </div>
          {fieldErrors.has("biayaPerbaikan") && (
            <p className="text-[11px] text-red-500 mt-1">Repair cost is required</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Spare Parts Used</label>
          <input
            type="text"
            value={form.sparePartDigunakan}
            disabled={isCompleted}
            onChange={e => setForm(f => ({ ...f, sparePartDigunakan: e.target.value }))}
            placeholder="List spare parts used"
            className={inputCls}
          />
        </div>
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 min-h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save Progress"}
          </button>
          <button
            onClick={handleComplete}
            disabled={completing || saving}
            className="flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            {completing ? "Processing…" : "Complete Maintenance"}
          </button>
        </div>
      )}
    </div>
  );
}
