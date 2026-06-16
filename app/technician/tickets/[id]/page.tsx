"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Save, MapPin, Calendar, Tag } from "lucide-react";

interface Ticket {
  id: number;
  idAset: number;
  nama: string | null;
  lokasiGedung: string | null;
  lokasiLantai: string | null;
  lokasiZona: string | null;
  kategori: string | null;
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

const SEVERITY_OPTIONS = ["Fatal", "Berat", "Sedang", "Ringan"];

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-[border-color,box-shadow] bg-white";
const labelCls = "block text-xs font-medium text-slate-600 mb-1.5";

function InfoPill({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value ?? "—"}</p>
    </div>
  );
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<WorkForm>({
    tanggalPengerjaan: "", tanggalSelesai: "", jenisKerusakan: "", severity: "",
    penyebab: "", biayaPerbaikan: "", sparePartDigunakan: "", teknisiPelaksana: "",
  });
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.status === 403 || res.status === 404) { router.push("/technician/tickets"); return; }
      const json = await res.json();
      const t: Ticket = json.data;
      setTicket(t);
      setForm({
        tanggalPengerjaan: t.tanggalPengerjaan ?? "",
        tanggalSelesai: t.tanggalSelesai ?? "",
        jenisKerusakan: t.jenisKerusakan ?? "",
        severity: t.severity ?? "",
        penyebab: t.penyebab ?? "",
        biayaPerbaikan: t.biayaPerbaikan != null ? String(t.biayaPerbaikan) : "",
        sparePartDigunakan: t.sparePartDigunakan ?? "",
        teknisiPelaksana: t.teknisiPelaksana ?? "",
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
          biayaPerbaikan: form.biayaPerbaikan ? Number(form.biayaPerbaikan.replace(/\D/g, "")) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast("Progress disimpan");
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!form.tanggalSelesai || !form.jenisKerusakan || !form.severity || !form.biayaPerbaikan || !form.teknisiPelaksana) {
      showToast("Lengkapi semua field wajib (*) sebelum menyelesaikan", false);
      return;
    }
    setCompleting(true);
    try {
      const res = await fetch(`/api/tickets/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          biayaPerbaikan: Number(form.biayaPerbaikan.replace(/\D/g, "")),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast("Maintenance selesai! Tiket ditutup.");
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menyelesaikan", false);
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-1/4" />
        <div className="h-32 bg-slate-50 rounded-xl" />
        <div className="h-64 bg-slate-50 rounded-xl" />
      </div>
    );
  }
  if (!ticket) return null;

  return (
    <div className="space-y-5 max-w-2xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/technician/tickets")} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Tiket #{ticket.id}</h1>
          <p className="text-[12px] text-slate-400">
            Status: {ticket.ticketStatus === "completed" ? "Selesai" : ticket.ticketStatus === "in_progress" ? "Sedang Dikerjakan" : "Baru"}
          </p>
        </div>
        {isCompleted && (
          <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs font-medium text-green-600">
            <CheckCircle className="w-3.5 h-3.5" /> Selesai
          </span>
        )}
      </div>

      {/* Asset info card */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Informasi Aset</p>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">{ticket.nama}</p>
            <p className="text-[12px] text-slate-400">{ticket.merek} · {ticket.kategori}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InfoPill label="Gedung" value={ticket.lokasiGedung} />
          <InfoPill label="Lantai" value={ticket.lokasiLantai} />
        </div>
        {ticket.tanggalPerencanaan && (
          <div className="flex items-center gap-2 text-[12px] text-indigo-500">
            <Calendar className="w-3.5 h-3.5" />
            Tanggal rencana: {new Date(ticket.tanggalPerencanaan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
      </div>

      {/* Work form */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Detail Pengerjaan</p>

        {isCompleted && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-[12px] text-green-700">
            Tiket ini sudah selesai. Data tidak dapat diubah lagi.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tanggal Pengerjaan</label>
            <input type="date" value={form.tanggalPengerjaan} disabled={isCompleted}
              onChange={e => setForm(f => ({ ...f, tanggalPengerjaan: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tanggal Selesai *</label>
            <input type="date" value={form.tanggalSelesai} disabled={isCompleted}
              onChange={e => setForm(f => ({ ...f, tanggalSelesai: e.target.value }))}
              className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Jenis Kerusakan *</label>
          <input type="text" value={form.jenisKerusakan} disabled={isCompleted}
            onChange={e => setForm(f => ({ ...f, jenisKerusakan: e.target.value }))}
            placeholder="Deskripsikan jenis kerusakan"
            className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Severity *</label>
            <select value={form.severity} disabled={isCompleted}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
              className={inputCls}>
              <option value="">Pilih severity</option>
              {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Teknisi Pelaksana *</label>
            <input type="text" value={form.teknisiPelaksana} disabled={isCompleted}
              onChange={e => setForm(f => ({ ...f, teknisiPelaksana: e.target.value }))}
              placeholder="Nama teknisi"
              className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Penyebab</label>
          <textarea value={form.penyebab} disabled={isCompleted}
            onChange={e => setForm(f => ({ ...f, penyebab: e.target.value }))}
            rows={3} placeholder="Deskripsikan penyebab kerusakan"
            className={inputCls + " resize-none"} />
        </div>

        <div>
          <label className={labelCls}>Biaya Perbaikan *</label>
          <input type="number" value={form.biayaPerbaikan} disabled={isCompleted}
            onChange={e => setForm(f => ({ ...f, biayaPerbaikan: e.target.value }))}
            placeholder="0"
            className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Spare Part Digunakan</label>
          <input type="text" value={form.sparePartDigunakan} disabled={isCompleted}
            onChange={e => setForm(f => ({ ...f, sparePartDigunakan: e.target.value }))}
            placeholder="Daftar spare part yang digunakan"
            className={inputCls} />
        </div>
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan…" : "Simpan Progress"}
          </button>
          <button onClick={handleComplete} disabled={completing || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
            <CheckCircle className="w-4 h-4" />
            {completing ? "Memproses…" : "Selesaikan Maintenance"}
          </button>
        </div>
      )}
    </div>
  );
}
