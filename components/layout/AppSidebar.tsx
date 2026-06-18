"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import DashboardIcon from "@/public/dashboard.webp";
import AssetsIcon from "@/public/assets.webp";
import ReportsIcon from "@/public/report.webp";
import DashboardIconActive from "@/public/dashboardActive.webp";
import assetsIconActive from "@/public/assetsActive.webp";
import reportsIconActive from "@/public/reportsActive.webp";
import { LogOut, ArrowLeftRight, Wrench, ClipboardList, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { name: "Dashboard", href: "/dashboard", icon: DashboardIcon, iconActive: DashboardIconActive },
  { name: "Assets",    href: "/assets",    icon: AssetsIcon,    iconActive: assetsIconActive    },
  { name: "AI Reports",href: "/reports",   icon: ReportsIcon,   iconActive: reportsIconActive   },
];

const LOG_LINKS = [
  { name: "Replacement Log",  href: "/logs/replacement", Icon: ArrowLeftRight },
  { name: "Maintenance Log",  href: "/logs/maintenance", Icon: Wrench         },
];

const ADMIN_LINKS = [
  { name: "Technicians", href: "/admin/technicians", Icon: Users },
];

export function AppSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { isOpen, setIsOpen } = useSidebar();
  const [role, setRole] = useState<"admin" | "teknisi" | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => setRole(d?.user?.role ?? "admin"))
      .catch(() => setRole("admin"));
  }, []);

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    router.push("/");
  }

  const isTeknisi = role === "teknisi";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`w-56 shrink-0 flex flex-col h-screen fixed md:static inset-y-0 left-0 z-50 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out select-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ background: "linear-gradient(175deg, #0e1420 0%, #111827 60%, #0f172a 100%)" }}
      >
        {/* Indigo glow at top */}
        <div
          className="absolute top-0 inset-x-0 h-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% -30%, rgba(99,102,241,0.22) 0%, transparent 70%)" }}
        />

        {/* ── Brand ── */}
        <div className="relative px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <Image src="/Logo.png" alt="PRISM" width={32} height={32} style={{ objectFit: "contain" }} className="shrink-0" />
            <span
              className="text-[20px] font-bold tracking-tight leading-none"
              style={{ background: "linear-gradient(90deg, #f1f5f9 0%, #a5b4fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              PRISM
            </span>
          </div>
          {isTeknisi && (
            <div className="mt-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-400/70">Technician Portal</span>
            </div>
          )}
        </div>

        {/* Top divider */}
        <div className="mx-4 h-px mb-3" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)" }} />

        {/* ── Navigation ── */}
        <nav className="flex-1 px-2.5 overflow-y-auto space-y-0.5">

          {isTeknisi ? (
            /* Teknisi nav: only tickets */
            <>
              <p className="px-2 mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Menu</p>
              <NavItem href="/technician/tickets" label="My Tickets" isActive={pathname.startsWith("/technician/tickets")}>
                <ClipboardList style={{ width: 15, height: 15 }} />
              </NavItem>
            </>
          ) : (
            /* Admin nav: full navigation */
            <>
              <p className="px-2 mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Main</p>

              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href) || (pathname === "/" && link.href === "/dashboard");
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`relative flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#111827] ${
                      isActive ? "text-white" : "text-white/40 hover:text-white/75 hover:bg-white/4.5"
                    }`}
                    style={isActive ? { background: "rgba(99,102,241,0.18)" } : undefined}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-indigo-400" />}
                    <Image src={isActive ? link.iconActive : link.icon} alt={link.name} className="shrink-0" style={{ width: 16, height: 16, opacity: isActive ? 1 : 0.6 }} />
                    {link.name}
                  </Link>
                );
              })}

              {/* Records section */}
              <div className="pt-4 pb-1.5">
                <div className="mx-2 h-px mb-3" style={{ background: "rgba(255,255,255,0.05)" }} />
                <p className="px-2 mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Records</p>
              </div>

              {LOG_LINKS.map(({ name, href, Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <NavItem key={name} href={href} label={name} isActive={isActive}>
                    <Icon style={{ width: 15, height: 15, opacity: isActive ? 0.9 : 0.5 }} />
                  </NavItem>
                );
              })}

              {/* Admin section */}
              <div className="pt-4 pb-1.5">
                <div className="mx-2 h-px mb-3" style={{ background: "rgba(255,255,255,0.05)" }} />
                <p className="px-2 mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Admin</p>
              </div>

              {ADMIN_LINKS.map(({ name, href, Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <NavItem key={name} href={href} label={name} isActive={isActive}>
                    <Icon style={{ width: 15, height: 15, opacity: isActive ? 0.9 : 0.5 }} />
                  </NavItem>
                );
              })}
            </>
          )}
        </nav>

        {/* ── Bottom: Logout ── */}
        <div className="mx-4 h-px mt-3" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="px-2.5 py-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 min-h-11 w-full rounded-xl text-sm font-medium text-white/30 hover:text-white/65 hover:bg-white/4.5 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#111827]"
          >
            <LogOut style={{ width: 15, height: 15 }} className="shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({ href, label, isActive, children }: {
  href: string;
  label: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#111827] ${
        isActive ? "text-white" : "text-white/40 hover:text-white/75 hover:bg-white/4.5"
      }`}
      style={isActive ? { background: "rgba(99,102,241,0.18)" } : undefined}
    >
      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-indigo-400" />}
      <span className={`shrink-0 ${isActive ? "text-indigo-400" : ""}`}>{children}</span>
      {label}
    </Link>
  );
}
