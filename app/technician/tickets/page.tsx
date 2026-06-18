"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, MapPin, Calendar, ChevronRight, Wrench, AlertTriangle, History } from "lucide-react";

interface Ticket {
  id: number;
  idAset: number;
  nama: string | null;
  lokasiGedung: string | null;
  lokasiLantai: string | null;
  kategori: string | null;
  tanggalPerencanaan: string | null;
  tanggalSelesai: string | null;
  ticketStatus: string | null;
}

function isOverdue(ticket: Ticket) {
  if (ticket.ticketStatus === "completed") return false;
  if (!ticket.tanggalPerencanaan) return false;
  return new Date(ticket.tanggalPerencanaan) < new Date(new Date().toDateString());
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open:        { label: "New",         cls: "bg-blue-50 text-blue-600 border-blue-200"   },
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

function TicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const overdue = isOverdue(ticket);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border bg-white p-4 hover:shadow-sm transition-all group cursor-pointer ${
        overdue ? "border-red-200 hover:border-red-300" : "border-slate-100 hover:border-indigo-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={ticket.ticketStatus} />
            {overdue && (
              <span className="flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                <AlertTriangle className="w-3 h-3" /> Overdue
              </span>
            )}
            <span className="text-[11px] text-slate-300">#{ticket.id}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{ticket.nama ?? "—"}</p>
          <p className="text-[12px] text-slate-400 mt-0.5">{ticket.kategori ?? "—"}</p>
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {(ticket.lokasiGedung || ticket.lokasiLantai) && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin className="w-3 h-3" />
                {[ticket.lokasiGedung, ticket.lokasiLantai].filter(Boolean).join(" · ")}
              </span>
            )}
            {ticket.tanggalPerencanaan && (
              <span className={`flex items-center gap-1 text-[11px] ${overdue ? "text-red-400" : "text-slate-400"}`}>
                <Calendar className="w-3 h-3" />
                Planned: {new Date(ticket.tanggalPerencanaan).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
      </div>
    </button>
  );
}

function TicketSkeleton() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 motion-safe:animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-5 bg-slate-100 rounded-full w-16" />
        <div className="h-3 bg-slate-100 rounded w-8" />
      </div>
      <div className="h-4 bg-slate-100 rounded w-2/3 mb-1.5" />
      <div className="h-3 bg-slate-100 rounded w-1/3 mb-3" />
      <div className="flex gap-3">
        <div className="h-3 bg-slate-100 rounded w-24" />
        <div className="h-3 bg-slate-100 rounded w-28" />
      </div>
    </div>
  );
}

export default function TechnicianTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"active" | "history">("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      const json = await res.json();
      setTickets(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active  = tickets.filter(t => t.ticketStatus !== "completed");
  const history = tickets.filter(t => t.ticketStatus === "completed");
  const overdue = active.filter(isOverdue);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <ClipboardList style={{ width: 18, height: 18 }} className="text-indigo-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Tickets</h1>
          <p className="text-[12px] text-slate-400">Maintenance tasks assigned to you</p>
        </div>
      </div>

      {/* Overdue alert */}
      {!loading && overdue.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {overdue.length} ticket{overdue.length > 1 ? "s" : ""} past the planned date
            </p>
            <p className="text-[12px] text-red-500 mt-0.5">Please complete maintenance on these assets promptly.</p>
          </div>
        </div>
      )}

      {/* View tabs */}
      <div className="flex items-center gap-1 border-b border-slate-100">
        {([
          { key: "active",  label: "Active",  count: active.length,  Icon: ClipboardList },
          { key: "history", label: "History", count: history.length, Icon: History       },
        ] as const).map(({ key, label, count, Icon: Ico }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex items-center gap-1.5 px-3 min-h-11 text-[12px] font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
              view === key
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Ico className="w-3.5 h-3.5" />
            {label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              view === key ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-3">
          <TicketSkeleton />
          <TicketSkeleton />
          <TicketSkeleton />
        </div>
      ) : view === "active" ? (
        active.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white px-6 py-12 text-center">
            <Wrench className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">No active tickets</p>
            <p className="text-[12px] text-slate-400 mt-1">New tickets will appear here when assigned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {overdue.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-400">Overdue</p>
                {overdue.map(t => (
                  <TicketCard key={t.id} ticket={t} onClick={() => router.push(`/technician/tickets/${t.id}`)} />
                ))}
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-4">Others</p>
              </>
            )}
            {active.filter(t => !isOverdue(t)).map(t => (
              <TicketCard key={t.id} ticket={t} onClick={() => router.push(`/technician/tickets/${t.id}`)} />
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white px-6 py-12 text-center">
            <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">No history yet</p>
            <p className="text-[12px] text-slate-400 mt-1">Completed maintenance history will appear here</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600">Completed Maintenance History</p>
            </div>
            <div className="divide-y divide-slate-100">
              {history.map(t => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/technician/tickets/${t.id}`)}
                  className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={t.ticketStatus} />
                        <span className="text-[11px] text-slate-300">#{t.id}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 truncate">{t.nama}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {t.lokasiGedung && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin className="w-3 h-3" />{t.lokasiGedung}
                          </span>
                        )}
                        {t.tanggalSelesai && (
                          <span className="flex items-center gap-1 text-[11px] text-green-500">
                            <Calendar className="w-3 h-3" />
                            Completed: {new Date(t.tanggalSelesai).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 shrink-0 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
