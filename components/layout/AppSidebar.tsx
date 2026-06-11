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
import { LogOut, ArrowLeftRight, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, setIsOpen } = useSidebar();

  const links = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: DashboardIcon,
      iconActive: DashboardIconActive,
    },
    {
      name: "Assets",
      href: "/assets",
      icon: AssetsIcon,
      iconActive: assetsIconActive,
    },

    {
      name: "AI Reports",
      href: "/reports",
      icon: ReportsIcon,
      iconActive: reportsIconActive,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`w-64 md:w-1/8 shrink-0 bg-[#333333] text-white flex flex-col h-screen overflow-y-auto fixed md:static inset-y-0 left-0 z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-blue-400 text-3xl">
              <img src="/icon.webp" alt="" />
            </span>{" "}
            PRISM_
          </h1>
        </div>
        <nav className="flex-1 px-4 py-8 space-y-2">
          {links.map((link) => {
            const isActive =
              pathname.startsWith(link.href) ||
              (pathname === "/" && link.href === "/dashboard");
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-white text-[#3F65ED]"
                    : "text-gray hover:bg-white/10"
                }`}
              >
                <Image
                  src={isActive ? link.iconActive : link.icon}
                  alt={link.name}
                  className="w-5 h-5"
                />
                <span className="font-medium">{link.name}</span>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="pt-3 pb-1">
            <p className="px-4 text-[10px] font-semibold uppercase tracking-widest text-white/30">Logs</p>
          </div>

          <Link
            href="/logs/replacement"
            className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
              pathname.startsWith("/logs/replacement")
                ? "bg-white text-[#3F65ED]"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            <ArrowLeftRight className="w-5 h-5 shrink-0" />
            <span className="font-medium">Replacement Log</span>
          </Link>

          <Link
            href="/logs/maintenance"
            className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
              pathname.startsWith("/logs/maintenance")
                ? "bg-white text-[#3F65ED]"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            <Wrench className="w-5 h-5 shrink-0" />
            <span className="font-medium">Maintenance Log</span>
          </Link>
        </nav>
        <div className="p-4 mt-auto">
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/");
              } catch (error) {
                console.error("Failed to logout", error);
              }
            }}
            className="flex items-center gap-4 px-4 py-3 rounded-lg transition-colors w-full text-left text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
