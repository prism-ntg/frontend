"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Users, Clock, UserCheck, DatabaseZap } from "lucide-react";

interface Technician {
  id: number;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Menunggu",  cls: "bg-amber-50 text-amber-600 border-amber-200" },
    active:   { label: "Aktif",     cls: "bg-green-50 text-green-600 border-green-200" },
    rejected: { label: "Ditolak",   cls: "bg-red-50 text-red-500 border-red-200" },
  };
  const m = map[status] ?? { label: status, cls: "bg-slate-50 text-slate-500 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${m.cls}`}>
      {m.label}
    </span>
  );
}

export default function AdminTechniciansPage() {
  const [tecnicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  async function handleSeed() {
    if (!confirm("Generate akun teknisi dari data historis komplain? Akun yang sudah ada tidak akan ditimpa.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-teknisi", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast(`Berhasil: ${json.created} akun dibuat, ${json.skipped} sudah ada`);
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal seed teknisi", false);
    } finally {
      setSeeding(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/technicians");
      const json = await res.json();
      setTechnicians(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleAction(id: number, action: "approve" | "reject") {
    setActioning(id);
    try {
      const res = await fetch(`/api/admin/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast(action === "approve" ? "Teknisi disetujui" : "Teknisi ditolak");
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal", false);
    } finally {
      setActioning(null);
    }
  }

  const pending = tecnicians.filter(t => t.status === "pending");
  const active  = tecnicians.filter(t => t.status === "active");
  const rejected = tecnicians.filter(t => t.status === "rejected");

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manajemen Teknisi</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola pendaftaran dan status akun teknisi</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 text-[12px] font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors shrink-0"
        >
          <DatabaseZap className="w-4 h-4" />
          {seeding ? "Memproses…" : "Seed Teknisi"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Menunggu Persetujuan", count: pending.length, Icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Teknisi Aktif", count: active.length, Icon: UserCheck, color: "text-green-500", bg: "bg-green-50" },
          { label: "Total Teknisi", count: tecnicians.length, Icon: Users, color: "text-indigo-500", bg: "bg-indigo-50" },
        ].map(({ label, count, Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 leading-none">{count}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending section */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">Menunggu Persetujuan ({pending.length})</span>
          </div>
          <div className="divide-y divide-amber-100">
            {pending.map(t => (
              <div key={t.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{t.name}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">{t.email}</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Mendaftar {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(t.id, "reject")}
                    disabled={actioning === t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-[12px] font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Tolak
                  </button>
                  <button
                    onClick={() => handleAction(t.id, "approve")}
                    disabled={actioning === t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-[12px] font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Setujui
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All technicians table */}
      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">Semua Teknisi</span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Memuat data…</div>
        ) : tecnicians.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Belum ada teknisi terdaftar.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Nama", "Email", "Status", "Bergabung", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tecnicians.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-[13px]">{t.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-slate-400 text-[12px]">
                    {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    {t.status === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(t.id, "reject")} disabled={actioning === t.id}
                          className="text-[11px] text-red-500 hover:underline disabled:opacity-40">Tolak</button>
                        <button onClick={() => handleAction(t.id, "approve")} disabled={actioning === t.id}
                          className="text-[11px] text-green-600 hover:underline disabled:opacity-40">Setujui</button>
                      </div>
                    )}
                    {t.status === "rejected" && (
                      <button onClick={() => handleAction(t.id, "approve")} disabled={actioning === t.id}
                        className="text-[11px] text-indigo-500 hover:underline disabled:opacity-40">Aktifkan</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
