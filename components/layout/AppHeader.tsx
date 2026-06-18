"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bell, Menu, LayoutDashboard, Package, FileText,
  ArrowLeftRight, Wrench, ClipboardList, Users, CheckCheck, X,
  CheckCircle, AlertTriangle
} from "lucide-react";
import { useSidebar } from "./SidebarContext";

interface UserInfo { name?: string; email?: string; role?: string; }

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: number;
  relatedTicketId: number | null;
  createdAt: string;
}

const PAGE_META: Record<string, { title: string; subtitle: string; Icon: React.ElementType }> = {
  "/dashboard":           { title: "Dashboard",       subtitle: "System overview & analytics",          Icon: LayoutDashboard },
  "/assets":              { title: "Assets",           subtitle: "Manage and monitor your equipment",    Icon: Package         },
  "/update_assets":       { title: "Assets",           subtitle: "Add or update asset records",          Icon: Package         },
  "/reports":             { title: "AI Reports",       subtitle: "Predictive maintenance insights",      Icon: FileText        },
  "/logs/replacement":    { title: "Replacement Log",  subtitle: "Asset swap & replacement history",     Icon: ArrowLeftRight  },
  "/logs/maintenance":    { title: "Maintenance Log",  subtitle: "Repair and service records",           Icon: Wrench          },
  "/admin/technicians":   { title: "Technicians",      subtitle: "Manage technician accounts",           Icon: Users           },
  "/technician/tickets":  { title: "My Tickets",        subtitle: "Maintenance tasks assigned to you",    Icon: ClipboardList   },
};

function getPageMeta(path: string) {
  for (const [key, meta] of Object.entries(PAGE_META)) {
    if (path.startsWith(key)) return meta;
  }
  return { title: "PRISM", subtitle: "Maintenance AI platform", Icon: LayoutDashboard };
}

function getInitials(user: UserInfo | null) {
  if (!user) return "U";
  const name = user.name ?? user.email ?? "";
  return name.split(/[\s@]/g).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "U";
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NOTIF_ICON: Record<string, { bg: string; text: string; Icon: React.ElementType }> = {
  ticket_assigned:  { bg: "bg-indigo-50",  text: "text-indigo-500",  Icon: ClipboardList  },
  ticket_completed: { bg: "bg-green-50",   text: "text-green-500",   Icon: CheckCircle    },
  ticket_created:   { bg: "bg-blue-50",    text: "text-blue-500",    Icon: Bell           },
  ticket_overdue:   { bg: "bg-red-50",     text: "text-red-500",     Icon: AlertTriangle  },
};

export function AppHeader() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.data ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => setUser(data?.user ?? null))
      .catch(() => {});
    void loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    if (bellOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bellOpen]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST" }).catch(() => {});
    void loadNotifications();
  }

  async function markRead(id: number) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    void loadNotifications();
  }

  const meta = getPageMeta(pathname);
  const { Icon } = meta;
  const displayName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? null;

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 bg-white border-b border-slate-100">

      {/* ── Left: hamburger + page identity ── */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggle}
          className="md:hidden p-2 min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="min-w-0 leading-none">
            <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate">{meta.title}</p>
            <p className="text-[10px] text-slate-500 leading-tight truncate hidden sm:block">{meta.subtitle}</p>
          </div>
        </div>
      </div>

      {/* ── Right: bell + divider + user ── */}
      <div className="flex items-center gap-1 shrink-0">

        {/* Notification bell with dropdown */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => { setBellOpen(v => !v); if (!bellOpen) void loadNotifications(); }}
            className="relative p-2 min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-100 shadow-xl z-60 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium cursor-pointer rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500">
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setBellOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No notifications</p>
                  </div>
                ) : notifications.map(n => {
                  const notifIcon = NOTIF_ICON[n.type] ?? { bg: "bg-slate-50", text: "text-slate-400", Icon: Bell };
                  const { Icon: NotifIcon } = notifIcon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.isRead) void markRead(n.id); }}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${n.isRead ? "opacity-60" : ""}`}
                    >
                      <div className={`w-7 h-7 rounded-lg ${notifIcon.bg} flex items-center justify-center shrink-0`}>
                        <NotifIcon className={`w-3.5 h-3.5 ${notifIcon.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[12px] font-semibold leading-tight ${n.isRead ? "text-slate-500" : "text-slate-800"}`}>{n.title}</p>
                          {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-slate-300 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="w-px h-5 bg-slate-100 mx-2" />

        {/* User avatar + name */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 select-none"
            style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
            role="img"
            aria-label={`${displayName ?? "User"} avatar`}
          >
            {getInitials(user)}
          </div>
          {displayName && (
            <span className="text-[12px] font-medium text-slate-600 hidden sm:block max-w-[100px] truncate">
              {displayName}
            </span>
          )}
        </div>
      </div>

    </header>
  );
}
