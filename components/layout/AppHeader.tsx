"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Menu } from "lucide-react";
import { useSidebar } from "./SidebarContext";

export function AppHeader() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const [criticalCount, setCriticalCount] = useState(0);

  useEffect(() => {
    fetch("/api/assets/stats")
      .then(r => r.json())
      .then(data => setCriticalCount(data?.byKekritisan?.critical ?? 0))
      .catch(() => {});
  }, []);

  const getPageName = (path: string) => {
    if (path === "/" || path === "/dashboard") return "Dashboard";
    const segment = path.split("/")[1];
    if (!segment) return "Dashboard";
    if (segment === "reports") return "AI Reports";
    if (segment === "update_assets") return "Assets";
    return (
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/[-_]/g, " ")
    );
  };

  const pageName = getPageName(pathname);

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">{pageName}</h2>
      </div>
      <button
        className="p-2 rounded-full hover:bg-gray-100 transition-colors relative cursor-pointer"
        title={criticalCount > 0 ? `${criticalCount} critical assets need attention` : "Notifications"}
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {criticalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
            {criticalCount > 99 ? "99+" : criticalCount}
          </span>
        )}
      </button>
    </header>
  );
}
