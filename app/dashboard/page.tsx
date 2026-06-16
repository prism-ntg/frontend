"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, ChevronRight, PlusSquare, Sparkles, SquarePen, X } from "lucide-react";

// Types                                                                     

interface MonthCount { month: string; total: number }
interface CategoryCount { name: string; count: number; maintenanceCount?: number }
interface TopAsset {
  idAset: number;
  nama: string | null;
  tipe: string | null;
  lokasiGedung: string | null;
  kekritisan: string | null;
  statusJadwal: string | null;
  complaintCount: number;
  latestSeverity: string | null;
}
interface Stats {
  total: number;
  recentlyAdded: number;
  bySeverity: { critical: number; atRisk: number; healthy: number };
  byKekritisan: { critical: number; major: number; minor: number };
  byJadwal: { Harian: number; Mingguan: number; Bulanan: number; Tahunan: number; Reactive: number };
  byKategori: CategoryCount[];
  topAssets: TopAsset[];
  maintenanceByMonth: MonthCount[];
}
interface BuildingCost {
  gedung: string;
  totalBiayaPerbaikan: number;
  totalKomplain: number;
}

// Helpers                                                                   

function fmtMonth(m: string): string {
  return new Date(m + "-01").toLocaleString("en-US", { month: "short", year: "2-digit" });
}
function addMonths(ym: string, n: number): string {
  const [y, mo] = ym.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function buildMonthRange(from: string, count = 12): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(from, i));
}

// Animated Number (count-up on mount)                                      

function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
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

// Severity Badge (maps aset_komplain severity: Fatal/Berat/Sedang/Ringan)

const SEV_ID_TO_EN: Record<string, string> = {
  Fatal: "Fatal", Berat: "Serious", Sedang: "Medium", Ringan: "Mild",
};
const SEV_BADGE: Record<string, string> = {
  Fatal:   "bg-red-100 text-red-700 border-red-200",
  Serious: "bg-orange-100 text-orange-700 border-orange-200",
  Medium:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  Mild:    "bg-green-100 text-green-700 border-green-200",
};

function SeverityBadge({ severity }: { severity: string | null }) {
  const en = severity ? (SEV_ID_TO_EN[severity] ?? severity) : null;
  const cls = en && SEV_BADGE[en] ? SEV_BADGE[en] : "bg-zinc-100 text-zinc-500 border-zinc-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${cls} whitespace-nowrap`}>
      {en ?? "—"}
    </span>
  );
}

// Date Range Filter

function fmtMonthFull(m: string) {
  return new Date(m + "-01").toLocaleString("en-US", { month: "short", year: "numeric" });
}

function DateRangeFilter({
  fromMonth, toMonth, onFromChange,
}: {
  fromMonth: string; toMonth: string;
  onFromChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-150 cursor-pointer shadow-sm"
      >
        <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>{fmtMonthFull(fromMonth)} – {fmtMonthFull(toMonth)}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-100 shadow-2xl p-5 w-64"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "scale(1)" : "scale(0.96)",
          pointerEvents: open ? "auto" : "none",
          transformOrigin: "top right",
          transition: "opacity 150ms cubic-bezier(0.23,1,0.32,1), transform 150ms cubic-bezier(0.23,1,0.32,1)",
        }}
      >
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-800">Select Period</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Chart always displays 12 months</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Start Month</p>
              <input
                type="month"
                value={fromMonth}
                onChange={e => onFromChange(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent cursor-pointer font-medium"
              />
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] text-slate-400">auto</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">End Month</p>
              <div className="w-full rounded-xl px-3 py-2.5 bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700">{fmtMonthFull(toMonth)}</span>
                <span className="text-[10px] text-indigo-400 bg-indigo-100 rounded-full px-1.5 py-0.5">+11 mo</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-xl bg-indigo-600 text-white text-xs font-semibold py-2.5 hover:bg-indigo-700 active:scale-[0.97] transition duration-150 cursor-pointer"
          >
            Apply
          </button>
        </div>
    </div>
  );
}

// Maintenance Bar Chart                                                     

function niceGridStep(maxVal: number): number {
  // pick a "round" step that yields 4-6 grid lines
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  const target = maxVal / 5;
  return candidates.reduce((best, c) =>
    Math.abs(c - target) < Math.abs(best - target) ? c : best
  );
}

function MaintenanceBarChart({ data, fromMonth }: { data: MonthCount[]; fromMonth: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [displayData, setDisplayData] = useState(data);
  const [exiting, setExiting] = useState(false);
  const prevFromMonth = useRef<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Skip if fromMonth hasn't actually changed (handles React Strict Mode double-invoke)
    if (prevFromMonth.current === null || prevFromMonth.current === fromMonth) {
      prevFromMonth.current = fromMonth;
      return;
    }
    prevFromMonth.current = fromMonth;
    setHovered(null);
    setExiting(true);
    setMounted(false);
    const t = setTimeout(() => {
      setDisplayData(data);
      setExiting(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromMonth]);

  if (displayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-44 text-sm text-slate-400">
        No maintenance records in selected range
      </div>
    );
  }

  const W = 900, H = 240;
  const PAD = { top: 20, right: 24, bottom: 44, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const bottomY = PAD.top + chartH;
  const maxVal = Math.max(...displayData.map(m => m.total), 10);
  const step = niceGridStep(maxVal);
  const yMax = Math.ceil((maxVal * 1.1) / step) * step;
  const gridLines: number[] = [];
  for (let v = step; v <= yMax; v += step) gridLines.push(v);
  const slotW = chartW / displayData.length;
  const barW = Math.min(slotW * 0.72, 80);
  const MIN_BH = 6;
  const bars = displayData.map((item, i) => {
    const cx = PAD.left + i * slotW + slotW / 2;
    const bh = item.total > 0 ? Math.max((item.total / yMax) * chartH, MIN_BH) : MIN_BH;
    const x = cx - barW / 2;
    const y = bottomY - bh;
    return { cx, x, y, bh, total: item.total, label: fmtMonth(item.month), isEmpty: item.total === 0 };
  });

  const trendPoints = bars.map(b => `${b.cx.toFixed(1)},${b.y.toFixed(1)}`);
  const trendD = trendPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const areaD = bars.length > 1
    ? trendD + ` L${bars[bars.length - 1].cx.toFixed(1)},${bottomY} L${bars[0].cx.toFixed(1)},${bottomY} Z`
    : "";

  const TW = 84;
  const tooltipX = hovered !== null
    ? Math.min(Math.max(bars[hovered].cx - TW / 2, PAD.left), W - PAD.right - TW)
    : 0;
  const tooltipY = hovered !== null ? Math.max(bars[hovered].y - 52, PAD.top) : 0;

  return (
    <div style={{
      opacity: exiting ? 0 : 1,
      transition: exiting ? "opacity 0.2s ease-out" : "opacity 0.3s ease-out",
    }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 252 }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F75FF" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="barGradHov" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F75FF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#4F75FF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map(v => {
          const y = bottomY - (v / yMax) * chartH;
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 3" />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8"
                fontFamily="system-ui,sans-serif">{v.toLocaleString()}</text>
            </g>
          );
        })}

        {/* X-axis baseline */}
        <line x1={PAD.left} y1={bottomY} x2={W - PAD.right} y2={bottomY} stroke="#e2e8f0" strokeWidth="1" />

        {/* Area fill under trend */}
        {areaD && <path d={areaD} fill="url(#areaGrad)" />}

        {/* Bars */}
        {bars.map((bar, i) => (
          <g key={i}>
            {bar.isEmpty ? (
              <rect
                x={bar.x} y={bottomY - MIN_BH} width={barW} height={MIN_BH} rx="3"
                fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 2"
                style={{
                  transformOrigin: `${bar.cx}px ${bottomY}px`,
                  transform: mounted ? "scaleY(1)" : "scaleY(0)",
                  transition: exiting
                    ? "transform 0.22s ease-out"
                    : `transform 0.45s ease-out ${i * 0.05}s`,
                }}
              />
            ) : (
              <rect
                x={bar.x} y={bar.y} width={barW} height={bar.bh} rx="5"
                fill={hovered === i ? "url(#barGradHov)" : "url(#barGrad)"}
                opacity={hovered !== null && hovered !== i ? 0.6 : 1}
                style={{
                  transformOrigin: `${bar.cx}px ${bottomY}px`,
                  transform: mounted ? "scaleY(1)" : "scaleY(0)",
                  transition: exiting
                    ? "transform 0.22s ease-out"
                    : `transform 0.55s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.05}s, fill 0.15s, opacity 0.15s`,
                }}
              />
            )}
            {/* hover target */}
            <rect
              x={bar.x - 3} y={PAD.top} width={barW + 6} height={chartH}
              fill="transparent" style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(i)}
            />
            <text x={bar.cx} y={H - 6} textAnchor="middle" fontSize="10"
              fill={hovered === i ? "#6366f1" : "#94a3b8"}
              fontFamily="system-ui,sans-serif"
              style={{ transition: "fill 0.15s" }}>
              {bar.label}
            </text>
          </g>
        ))}

        {/* Trend line */}
        {bars.length > 1 && (
          <path d={trendD} stroke="#f43f5e" strokeWidth="2" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="6 3" opacity="0.75" />
        )}
        {/* Trend dots */}
        {bars.map((bar, i) => (
          <circle key={i} cx={bar.cx} cy={bar.y} r={hovered === i ? 5 : 3.5}
            fill={bar.isEmpty ? "#fda4af" : "#f43f5e"}
            stroke="white" strokeWidth="1.5"
            style={{ transition: "r 0.15s" }}
            opacity={bar.isEmpty ? 0.5 : 0.85} />
        ))}

        {/* Tooltip */}
        {hovered !== null && (
          <g pointerEvents="none">
            <rect x={tooltipX} y={tooltipY} width={TW} height={40} rx={8} fill="#0f172a" />
            <text x={tooltipX + TW / 2} y={tooltipY + 14} textAnchor="middle"
              fontSize="9" fill="#94a3b8" fontFamily="system-ui,sans-serif">
              {bars[hovered].label}
            </text>
            <text x={tooltipX + TW / 2} y={tooltipY + 30} textAnchor="middle"
              fontSize="14" fontWeight="700" fill="white" fontFamily="system-ui,sans-serif">
              {bars[hovered].total.toLocaleString()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// Donut Chart                                                               

const CAT_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];

function DonutChart({ categories, total }: { categories: CategoryCount[]; total: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const R = 52, CX = 70, CY = 70;
  const circ = 2 * Math.PI * R;

  if (categories.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <svg viewBox="0 0 140 140" className="w-36 h-36">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth="20" />
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="16" fontWeight="700" fill="#cbd5e1">0</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">Assets</text>
        </svg>
        <p className="text-xs text-slate-400">No asset data</p>
      </div>
    );
  }

  const segments = categories.map((cat, i, arr) => {
    const pct = cat.count / total;
    const dash = Math.min(pct * circ, circ - 0.01);
    const cumPriorPct = arr.slice(0, i).reduce((s, c) => s + c.count / total, 0);
    const startDeg = -90 + cumPriorPct * 360;
    return { ...cat, dash, gap: circ - dash, startDeg, color: CAT_COLORS[i % CAT_COLORS.length] };
  });

  const hovSeg = hovered !== null ? segments[hovered] : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 140 140" className="w-36 h-36">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth="20" />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={hovered === i ? 25 : 20}
            strokeDasharray={`${mounted ? seg.dash : 0} ${mounted ? seg.gap : circ}`}
            transform={`rotate(${seg.startDeg} ${CX} ${CY})`}
            style={{
              transition: `stroke-dasharray 0.45s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s, stroke-width 0.2s ease`,
              cursor: "pointer",
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}

        {hovSeg ? (
          <>
            <text x={CX} y={CY - 8} textAnchor="middle" fontSize="8" fontWeight="600" fill={hovSeg.color}>
              {hovSeg.name.length > 12 ? hovSeg.name.slice(0, 12) + "…" : hovSeg.name}
            </text>
            <text x={CX} y={CY + 6} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1e293b">
              {hovSeg.count.toLocaleString()}
            </text>
            <text x={CX} y={CY + 18} textAnchor="middle" fontSize="8" fill="#94a3b8">
              {Math.round((hovSeg.count / total) * 100)}%
            </text>
          </>
        ) : (
          <>
            <text x={CX} y={CY - 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e293b">
              {total.toLocaleString()}
            </text>
            <text x={CX} y={CY + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">Assets</text>
          </>
        )}
      </svg>

      <div className="w-full space-y-1.5">
        {categories.map((cat, i) => (
          <div
            key={cat.name}
            className={`flex items-center gap-2 text-xs rounded-md px-1.5 py-1 transition-colors duration-150 cursor-pointer ${hovered === i ? "bg-slate-50" : ""}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
            <div className="flex-1 min-w-0">
              <span className="text-slate-600 truncate block">{cat.name}</span>
              {cat.maintenanceCount !== undefined && (
                <span className="text-[10px] text-slate-400 tabular-nums">{cat.maintenanceCount.toLocaleString()} maintenance</span>
              )}
            </div>
            <span className="text-slate-500 font-medium tabular-nums shrink-0">{cat.count.toLocaleString()}</span>
            <span className="text-slate-400 w-9 text-right tabular-nums shrink-0">
              {Math.round((cat.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

//  Horizontal Bars Chart (Kekritisan: Critical / Major / Minor)

function HorizontalBarsChart({
  critical, major, minor,
}: { critical: number; major: number; minor: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(t);
  }, []);

  const bars = [
    { label: "Critical", value: critical, color: "#f87171", bg: "#fef2f2" },
    { label: "Major",    value: major,    color: "#fb923c", bg: "#fff7ed" },
    { label: "Minor",    value: minor,    color: "#facc15", bg: "#fefce8" },
  ];
  const scale = Math.max(critical, major, minor, 1);

  return (
    <div className="space-y-4">
      {bars.map((bar, i) => {
        const widthPct = bar.value > 0 ? Math.max((bar.value / scale) * 100, 2) : 0;
        const isHov = hovered === i;
        return (
          <div
            key={bar.label}
            className="space-y-1.5 cursor-pointer"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{bar.label}</span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{
                  color: bar.color,
                  opacity: isHov ? 1 : 0.5,
                  transform: isHov ? "translateX(0)" : "translateX(4px)",
                  transition: "opacity 0.2s ease, transform 0.2s ease",
                }}
              >
                {bar.value.toLocaleString()}
              </span>
            </div>
            <div
              className="h-12 rounded-lg overflow-hidden"
              style={{
                backgroundColor: isHov ? bar.bg : "#f1f5f9",
                transition: "background-color 0.2s ease",
              }}
            >
              <div
                className="h-full rounded-lg"
                style={{
                  width: mounted ? `${widthPct}%` : "0%",
                  backgroundColor: bar.color,
                  opacity: hovered !== null && !isHov ? 0.3 : 1,
                  transition: `width 0.8s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.12}s, opacity 0.2s ease`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Frequency Tile                                                            

function FreqTile({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all duration-200 cursor-default">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-800 tabular-nums"><AnimatedNumber value={value} /></p>
      <p className="text-[10px] text-slate-400 mt-0.5">{pct}%</p>
    </div>
  );
}

// Location Filter Combobox

function FilterCombobox({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
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

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false); setQuery("");
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

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
  const listId = `cb-dash-${placeholder.replace(/\s+/g, "-").toLowerCase()}`;

  function pick(v: string) { onChange(v); setOpen(false); setQuery(""); }
  function clear(e: React.MouseEvent) { e.stopPropagation(); onChange(""); setOpen(false); setQuery(""); }

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center rounded-lg border shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ${
        open ? "border-indigo-300 ring-2 ring-indigo-100 bg-white" : value ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-slate-300"
      }`}>
        <input type="text" value={open ? query : value} placeholder={placeholder}
          role="combobox" aria-expanded={open} aria-controls={listId} aria-label={placeholder} aria-autocomplete="list"
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={`w-28 min-w-0 bg-transparent pl-3 py-1.5 text-xs focus:outline-none placeholder:text-slate-400 ${value && !open ? "text-indigo-600 font-medium" : "text-slate-700"}`} />
        {value && !open
          ? <button onClick={clear} aria-label="Clear location filter" className="px-2 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-3 h-3" /></button>
          : <ChevronDown className={`mr-2 w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        }
      </div>
      {open && rect && createPortal(
        <div ref={dropdownRef} id={listId} role="listbox"
          style={{ position: "fixed", left: rect.left, top: rect.top, minWidth: rect.width, transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
          className={`z-[100] w-max max-w-56 rounded-xl border border-slate-100 bg-white shadow-lg origin-top transition-[opacity,transform] duration-150 ${dropVis ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0
              ? <p className="px-3 py-2.5 text-xs text-slate-400 italic">No matches</p>
              : filtered.map(o => (
                <button key={o} role="option" aria-selected={value === o} onMouseDown={e => e.preventDefault()} onClick={() => pick(o)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors duration-100 ${value === o ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-600 hover:bg-slate-50"}`}>
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

// Cost formatting helper

function formatCost(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} jt`;
  if (value >= 1_000) return `Rp ${Math.round(value / 1_000)} rb`;
  return `Rp ${value.toLocaleString()}`;
}

// Building cost constants

const COST_YEARS = Array.from(
  { length: new Date().getFullYear() - 2019 },
  (_, i) => String(2020 + i),
);
const COST_MONTHS = [
  { value: "1", label: "Jan" }, { value: "2", label: "Feb" },
  { value: "3", label: "Mar" }, { value: "4", label: "Apr" },
  { value: "5", label: "May" }, { value: "6", label: "Jun" },
  { value: "7", label: "Jul" }, { value: "8", label: "Aug" },
  { value: "9", label: "Sep" }, { value: "10", label: "Oct" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
];

// Building Costs Chart

function CostsByBuildingChart({ data, loading }: { data: BuildingCost[]; loading: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (loading) { setMounted(false); return; }
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, [loading, data]);

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-3 w-28 rounded bg-slate-100 shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-slate-100" />
            <div className="h-3 w-16 rounded bg-slate-100 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-xs text-slate-400">
        No cost data for selected period
      </div>
    );
  }

  const maxCost = Math.max(...data.map(d => d.totalBiayaPerbaikan), 1);
  const COLORS = ["#4F75FF", "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];

  return (
    <div className="space-y-2.5">
      {data.map((item, i) => {
        const widthPct = item.totalBiayaPerbaikan > 0
          ? Math.max((item.totalBiayaPerbaikan / maxCost) * 100, 2)
          : 0;
        const color = COLORS[i % COLORS.length];
        return (
          <div key={item.gedung} className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 truncate w-28 shrink-0">{item.gedung}</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${widthPct}%` : "0%",
                  backgroundColor: color,
                  transition: `width 0.6s cubic-bezier(0.34,1.1,0.64,1) ${i * 0.06}s`,
                }}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-slate-400 tabular-nums">{item.totalKomplain}×</span>
              <span className="text-[11px] font-semibold text-slate-600 tabular-nums w-24 text-right">{formatCost(item.totalBiayaPerbaikan)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Dashboard Page

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [topAssetsLoc, setTopAssetsLoc] = useState("");
  const [topAssetsList, setTopAssetsList] = useState<TopAsset[] | null>(null);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [buildingCosts, setBuildingCosts] = useState<BuildingCost[]>([]);
  const [buildingYear, setBuildingYear] = useState(() => String(new Date().getFullYear()));
  const [buildingMonth, setBuildingMonth] = useState("");
  const [buildingLoading, setBuildingLoading] = useState(false);
  const router = useRouter();

  const [fromMonth, setFromMonth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboard_fromMonth");
      if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    }
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const toMonth = addMonths(fromMonth, 11);

  useEffect(() => {
    localStorage.setItem("dashboard_fromMonth", fromMonth);
  }, [fromMonth]);

  useEffect(() => {
    Promise.all([
      fetch("/api/assets/stats").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/assets/filters").then(r => r.json()),
    ])
      .then(([statsData, meData, filtersData]) => {
        setStats(statsData);
        const u = meData?.user;
        if (u?.name) setUserName(u.name.split(" ")[0]);
        else if (u?.email) setUserName(u.email.split("@")[0]);
        setLocationOptions(filtersData.lokasi ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!topAssetsLoc) return;
    fetch(`/api/assets/stats?location=${encodeURIComponent(topAssetsLoc)}`)
      .then(r => r.json())
      .then(d => setTopAssetsList(d.topAssets ?? []))
      .catch(console.error);
  }, [topAssetsLoc]);

  useEffect(() => {
    setBuildingLoading(true);
    const params = new URLSearchParams();
    if (buildingYear) params.set("year", buildingYear);
    if (buildingMonth) params.set("month", buildingMonth);
    fetch(`/api/assets/costs-by-building?${params}`)
      .then(r => r.json())
      .then(d => setBuildingCosts(d.data ?? []))
      .catch(console.error)
      .finally(() => setBuildingLoading(false));
  }, [buildingYear, buildingMonth]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse motion-reduce:animate-none">
        {/* Welcome */}
        <div>
          <div className="h-7 w-56 rounded-lg bg-slate-200" />
          <div className="h-4 w-72 rounded bg-slate-100 mt-2" />
        </div>

        {/* Row 1: KPI + Quick Actions */}
        <div className="grid grid-cols-12 gap-4">
          {/* Total Assets */}
          <div className="col-span-12 md:col-span-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="h-10 w-16 rounded-lg bg-slate-200" />
            <div className="h-2.5 w-28 rounded bg-slate-100" />
          </div>
          {/* Fatal / At Risk / Healthy */}
          <div className="col-span-12 md:col-span-6 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 space-y-2">
                <div className="h-2.5 w-10 rounded bg-slate-100" />
                <div className="h-8 w-12 rounded-lg bg-slate-200" />
                <div className="h-2.5 w-20 rounded bg-slate-100" />
              </div>
            ))}
          </div>
          {/* Quick Actions */}
          <div className="col-span-12 md:col-span-3 space-y-3">
            <div className="h-12 rounded-xl bg-slate-200 border border-slate-100" />
            <div className="h-11 rounded-xl bg-slate-100 border border-slate-100" />
            <div className="h-11 rounded-xl bg-slate-100 border border-slate-100" />
          </div>
        </div>

        {/* Row 2: Bar Chart + Frequency */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-8 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between mb-5">
              <div className="space-y-1.5">
                <div className="h-3.5 w-48 rounded bg-slate-200" />
                <div className="h-2.5 w-36 rounded bg-slate-100" />
              </div>
              <div className="h-8 w-36 rounded-lg bg-slate-100" />
            </div>
            {/* fake bars */}
            <div className="flex items-end gap-3 h-44 px-2">
              {[55, 80, 40, 95, 65, 30, 75, 90, 50, 70, 45, 85].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-slate-100" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="h-3.5 w-40 rounded bg-slate-200 mb-5" />
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <div className="h-2.5 w-10 rounded bg-slate-200" />
                  <div className="h-6 w-10 rounded bg-slate-200" />
                  <div className="h-2 w-6 rounded bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50 p-3 flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-2.5 w-12 rounded bg-slate-200" />
                <div className="h-6 w-10 rounded bg-slate-200" />
              </div>
              <div className="h-3 w-6 rounded bg-slate-100" />
            </div>
          </div>
        </div>

        {/* Row 3: Priority / Donut / Top Assets */}
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, col) => (
            <div key={col} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <div className="h-3.5 w-36 rounded bg-slate-200" />
              {col === 1 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-36 h-36 rounded-full bg-slate-100" />
                  <div className="w-full space-y-2">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="h-4 rounded bg-slate-100" />
                    ))}
                  </div>
                </div>
              ) : col === 0 ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="space-y-1.5">
                      <div className="flex justify-between">
                        <div className="h-2.5 w-12 rounded bg-slate-100" />
                        <div className="h-2.5 w-6 rounded bg-slate-100" />
                      </div>
                      <div className="h-12 rounded-lg bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="grid grid-cols-12 gap-1 py-1">
                      <div className="col-span-4 space-y-1">
                        <div className="h-2.5 w-full rounded bg-slate-200" />
                        <div className="h-2 w-3/4 rounded bg-slate-100" />
                      </div>
                      <div className="col-span-3 flex items-center">
                        <div className="h-4 w-14 rounded-full bg-slate-100" />
                      </div>
                      <div className="col-span-3 flex items-center">
                        <div className="h-2.5 w-12 rounded bg-slate-100" />
                      </div>
                      <div className="col-span-2 flex items-center">
                        <div className="h-2.5 w-6 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const total              = stats?.total ?? 0;
  const critical           = stats?.bySeverity.critical ?? 0;
  const atRisk             = stats?.bySeverity.atRisk ?? 0;
  const healthy            = stats?.bySeverity.healthy ?? 0;
  const kekritisanCritical = stats?.byKekritisan.critical ?? 0;
  const kekritisanMajor    = stats?.byKekritisan.major ?? 0;
  const kekritisanMinor    = stats?.byKekritisan.minor ?? 0;
  const jadwal             = stats?.byJadwal ?? { Harian: 0, Mingguan: 0, Bulanan: 0, Tahunan: 0, Reactive: 0 };
  const categories         = stats?.byKategori ?? [];
  const topAssets          = topAssetsLoc ? (topAssetsList ?? []) : (stats?.topAssets ?? []);
  const allMaintenance     = stats?.maintenanceByMonth ?? [];
  const recentlyAdded      = stats?.recentlyAdded ?? 0;

  const maintenanceMap = new Map(allMaintenance.map(d => [d.month, d.total]));
  const maintenance = buildMonthRange(fromMonth, 12).map(month => ({
    month,
    total: maintenanceMap.get(month) ?? 0,
  }));
  const nowKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
  const thisMonthMaint = maintenanceMap.get(nowKey) ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-5">

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back, {userName.charAt(0).toUpperCase() + userName.slice(1)}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Here&apos;s what has been happening right now</p>
      </div>

      {/* Row 1: KPI + Quick Actions */}
      <div className="grid grid-cols-12 gap-4">

        {/* Total Assets */}
        <div className="col-span-12 md:col-span-3 group rounded-xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden hover:shadow-md transition duration-200 cursor-default">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
          <p className="text-xs font-medium text-slate-500 mb-3">Total Assets</p>
          <p className="text-4xl font-bold text-slate-800 tabular-nums">
            <AnimatedNumber value={total} />
          </p>
          <p className="text-xs text-slate-400 mt-1.5">100% of all assets</p>
          {recentlyAdded > 0 && (
            <span className="absolute top-4 right-4 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 border border-green-200">
              +{recentlyAdded} this month
            </span>
          )}
        </div>

        {/* Health KPIs */}
        <div className="col-span-12 md:col-span-6 grid grid-cols-3 gap-3">
          <div className="group rounded-xl border border-red-200 bg-red-50 p-4 hover:shadow-md transition duration-200 cursor-default relative overflow-hidden">
            <div className="absolute inset-0 bg-red-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            <p className="text-xs font-medium text-red-500 mb-2">Fatal</p>
            <p className="text-3xl font-bold text-red-600 tabular-nums"><AnimatedNumber value={critical} /></p>
            <p className="text-[11px] text-red-400 mt-1.5">Assets w/ Critical Severity</p>
          </div>
          <div className="group rounded-xl border border-amber-200 bg-amber-50 p-4 hover:shadow-md transition duration-200 cursor-default relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            <p className="text-xs font-medium text-amber-500 mb-2">At Risk</p>
            <p className="text-3xl font-bold text-amber-600 tabular-nums"><AnimatedNumber value={atRisk} /></p>
            <p className="text-[11px] text-amber-400 mt-1.5">Assets w/ Serious / Medium</p>
          </div>
          <div className="group rounded-xl border border-blue-200 bg-blue-50 p-4 hover:shadow-md transition duration-200 cursor-default relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            <p className="text-xs font-medium text-blue-500 mb-2">Healthy</p>
            <p className="text-3xl font-bold text-blue-600 tabular-nums"><AnimatedNumber value={healthy} /></p>
            <p className="text-[11px] text-blue-400 mt-1.5">Assets w/ Mild Only</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 md:col-span-3 space-y-3 flex flex-col justify-center">
          <button
            onClick={() => router.push("/reports")}
            className="w-full flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition duration-150 cursor-pointer"
          >
            <span>Create Report</span>
            <Sparkles className="w-4 h-4 opacity-80" />
          </button>
          <button
            onClick={() => router.push("/assets")}
            className="w-full flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition duration-150 cursor-pointer"
          >
            <span>Edit Asset(s)</span>
            <SquarePen className="w-4 h-4 opacity-70" />
          </button>
          <button
            onClick={() => router.push("/update_assets")}
            className="w-full flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition duration-150 cursor-pointer"
          >
            <span>Add Asset(s)</span>
            <PlusSquare className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </div>

      {/* Row 2: Bar Chart + Frequency */}
      <div className="grid grid-cols-12 gap-4">

        {/* Maintenance Bar Chart */}
        <div className="col-span-12 md:col-span-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">Maintenance Activities Done</p>
              {thisMonthMaint > 0 && (
                <p className="text-xs text-green-600 mt-0.5">+{thisMonthMaint} activities completed this month</p>
              )}
            </div>
            <DateRangeFilter
              fromMonth={fromMonth}
              toMonth={toMonth}
              onFromChange={setFromMonth}
            />
          </div>
          <MaintenanceBarChart data={maintenance} fromMonth={fromMonth} />
        </div>

        {/* Maintenance Frequency */}
        <div className="col-span-12 md:col-span-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-4">Maintenance Frequency</p>
          <div className="grid grid-cols-2 gap-2.5">
            <FreqTile label="Daily"   value={jadwal.Harian}   pct={pct(jadwal.Harian)} />
            <FreqTile label="Weekly"  value={jadwal.Mingguan} pct={pct(jadwal.Mingguan)} />
            <FreqTile label="Monthly" value={jadwal.Bulanan}  pct={pct(jadwal.Bulanan)} />
            <FreqTile label="Yearly"  value={jadwal.Tahunan}  pct={pct(jadwal.Tahunan)} />
          </div>
          <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all duration-200">
            <div>
              <p className="text-[11px] text-slate-400 mb-0.5">Reactive</p>
              <p className="text-xl font-bold text-slate-800 tabular-nums"><AnimatedNumber value={jadwal.Reactive} /></p>
            </div>
            <p className="text-xs text-slate-400">{pct(jadwal.Reactive)}%</p>
          </div>
        </div>
      </div>

      {/* Row 4: Cost Distribution by Building */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Cost Distribution by Building</p>
            <p className="text-xs text-slate-400 mt-0.5">Total repair costs per location</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={buildingYear}
              onChange={e => setBuildingYear(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 cursor-pointer font-medium"
            >
              {COST_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={buildingMonth}
              onChange={e => setBuildingMonth(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 cursor-pointer font-medium"
            >
              <option value="">All Months</option>
              {COST_MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <CostsByBuildingChart data={buildingCosts} loading={buildingLoading} />
      </div>

      {/* Row 3: Health Bars + Donut + Top Assets */}
      <div className="grid grid-cols-3 gap-4">

        {/* Kekritisan */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-1">Priority Assets</p>
          {kekritisanCritical > 0 && (
            <p className="text-xs text-red-500 mb-4">{kekritisanCritical.toLocaleString()} Critical assets need attention</p>
          )}
          <div className={kekritisanCritical > 0 ? "" : "mt-4"}>
            <HorizontalBarsChart critical={kekritisanCritical} major={kekritisanMajor} minor={kekritisanMinor} />
          </div>
        </div>

        {/* Asset Overview Donut */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-1">Asset Category Overview</p>
          {recentlyAdded > 0 && (
            <p className="text-xs text-green-600 mb-4">+{recentlyAdded} assets added this month</p>
          )}
          <div className={recentlyAdded > 0 ? "" : "mt-4"}>
            <DonutChart categories={categories} total={total} />
          </div>
        </div>

        {/* Top Assets by Komplain */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">Top Assets by Complaint</p>
            <div className="flex items-center gap-2">
              <FilterCombobox
                value={topAssetsLoc}
                onChange={setTopAssetsLoc}
                options={locationOptions}
                placeholder="All Locations"
              />
              <button
                onClick={() => router.push(topAssetsLoc ? `/assets?search=` : "/assets")}
                className="p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                title="View all assets"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1 mb-2 px-0.5">
            <p className="col-span-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Asset</p>
            <p className="col-span-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Severity</p>
            <p className="col-span-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Location</p>
            <p className="col-span-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Complain</p>
          </div>

          <div className="divide-y divide-slate-50">
            {topAssets.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No complaint data found</p>
            ) : (
              topAssets.map(asset => (
                <div
                  key={asset.idAset}
                  onClick={() => router.push(`/assets?search=${encodeURIComponent(asset.nama ?? String(asset.idAset))}`)}
                  className="grid grid-cols-12 gap-1 py-2.5 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors px-0.5"
                >
                  <div className="col-span-4">
                    <p className="text-[11px] font-semibold text-indigo-600 truncate">{asset.nama ?? String(asset.idAset)}</p>
                    <p className="text-[10px] text-slate-400 truncate">{asset.tipe ?? "—"}</p>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <SeverityBadge severity={asset.latestSeverity} />
                  </div>
                  <div className="col-span-3 flex items-center">
                    <p className="text-[11px] text-slate-500 truncate">{asset.lokasiGedung ?? "—"}</p>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <p className="text-[11px] font-bold text-slate-700 tabular-nums">{asset.complaintCount}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
