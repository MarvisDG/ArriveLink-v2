import { type ReactNode } from "react";
import { Link } from "wouter";
import { Bus, Bell, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: number;
}

interface DashboardShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  bottomNavItems: NavItem[];
  activeKey: string;
  onNavClick: (key: string) => void;
  username: string;
  userInitials: string;
  userRole?: string;
  searchPlaceholder?: string;
  brandLabel?: string;
}

export function DashboardShell({
  children,
  title,
  subtitle,
  navItems,
  bottomNavItems,
  activeKey,
  onNavClick,
  username,
  userInitials,
  userRole,
  searchPlaceholder = "Search...",
  brandLabel = "Business Portal",
}: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <aside className="w-[220px] bg-white border-r flex flex-col shrink-0 shadow-sm">
        <div className="h-16 flex items-center px-4 border-b gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Bus className="h-[18px] w-[18px] text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-gray-900">ArriveLink</p>
            <p className="text-[10px] text-gray-500 leading-tight">{brandLabel}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              active={activeKey === item.key}
              onNavClick={onNavClick}
            />
          ))}
        </nav>

        <div className="p-3 border-t space-y-0.5">
          {bottomNavItems.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              active={activeKey === item.key}
              onNavClick={onNavClick}
            />
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-6 gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-gray-500 truncate">{subtitle}</p>
            )}
          </div>

          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              className="pl-9 w-52 bg-gray-50 border-gray-200 text-sm h-9 rounded-lg"
              placeholder={searchPlaceholder}
            />
          </div>

          <button className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0">
            <Bell className="h-4 w-4 text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-[1.5px] border-white" />
          </button>

          <div className="flex items-center gap-2 cursor-pointer shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-bold">{userInitials}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 leading-none">{username}</p>
              {userRole && (
                <p className="text-[11px] text-gray-500 mt-0.5">{userRole}</p>
              )}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarItem({
  item,
  active,
  onNavClick,
}: {
  item: NavItem;
  active: boolean;
  onNavClick: (key: string) => void;
}) {
  const cls = cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] w-full text-left transition-all font-medium select-none",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  );

  if (item.href && !item.onClick) {
    return (
      <Link href={item.href} className={cls} onClick={() => onNavClick(item.key)}>
        <span className="shrink-0 w-4 h-4 flex items-center justify-center">{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
            active ? "bg-white/25 text-white" : "bg-primary/10 text-primary"
          )}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <button
      className={cls}
      onClick={() => {
        if (item.onClick) {
          item.onClick();
        } else {
          onNavClick(item.key);
        }
      }}
    >
      <span className="shrink-0 w-4 h-4 flex items-center justify-center">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
          active ? "bg-white/25 text-white" : "bg-primary/10 text-primary"
        )}>
          {item.badge}
        </span>
      )}
    </button>
  );
}

export function StatCard({
  label,
  value,
  icon,
  iconBg,
  trend,
  sub,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconBg: string;
  trend?: { value: number; label?: string };
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
          {icon}
        </div>
        {trend != null && (
          <span className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
            trend.value >= 0
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          )}>
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value.toLocaleString()}</p>
      <p className="text-[13px] text-gray-500">{label}</p>
      {trend && trend.label && (
        <p className="text-[11px] text-gray-400 mt-1">{trend.label}</p>
      )}
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export const CHART_PRIMARY = "hsl(151, 100%, 21%)";
export const CHART_SECONDARY = "#f59e0b";
export const CHART_BLUE = "#3b82f6";
export const CHART_PURPLE = "#8b5cf6";
export const CHART_GRAY = "#e5e7eb";
export const PIE_COLORS = [CHART_PRIMARY, CHART_SECONDARY, CHART_BLUE, CHART_PURPLE, "#10b981", "#f97316"];
