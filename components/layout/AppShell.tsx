"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  if (isAuthPage) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <div className="min-h-full flex w-full overflow-hidden">
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 flex w-full flex-col h-screen overflow-hidden bg-[#F7F7F8]">
          <AppHeader />
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F5F5FC]">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-8 min-h-[calc(100vh-6rem)]">
              {children}
            </div>
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
