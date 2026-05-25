"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { useSidebar } from "./SidebarContext";

export function AppHeader() {
  const pathname = usePathname();
  const { toggle } = useSidebar();

  const getPageName = (path: string) => {
    if (path === "/" || path === "/dashboard") return "Dashboard";
    const segment = path.split("/")[1];
    if (!segment) return "Dashboard";
    return (
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
    );
  };

  const pageName = getPageName(pathname);

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">{pageName}</h2>
      </div>
      <button className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
        <Bell className="w-6 h-6 text-gray-600" />
      </button>
    </header>
  );
}
