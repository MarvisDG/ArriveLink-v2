"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  LayoutDashboard, Users, Building2, UserCog, Settings, LogOut,
  ShieldCheck, Edit2, Trash2, Check, X, Star, TrendingUp,
  MessageSquare, RefreshCw, ArrowUpRight, Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  DashboardShell, StatCard, type NavItem,
  CHART_PRIMARY, CHART_SECONDARY, CHART_BLUE, CHART_PURPLE, PIE_COLORS,
} from "@/components/dashboard-shell";

const API_BASE = "/api";

function getSecret() {
  return sessionStorage.getItem("admin_secret") ?? "";
}

function adminFetch(path: string, opts: RequestInit = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": getSecret(),
      ...(opts.headers ?? {}),
    },
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Request failed");
    return data;
  });
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const MONTHLY_USERS = [
  { month: "Jan", users: 8, messages: 22 },
  { month: "Feb", users: 15, messages: 38 },
  { month: "Mar", users: 23, messages: 55 },
  { month: "Apr", users: 34, messages: 89 },
  { month: "May", users: 41, messages: 112 },
  { month: "Jun", users: 50, messages: 145 },
];

const PLATFORM_GROWTH = [
  { week: "W1", routes: 12, searches: 34 },
  { week: "W2", routes: 15, searches: 52 },
  { week: "W3", routes: 18, searches: 67 },
  { week: "W4", routes: 18, searches: 81 },
  { week: "W5", routes: 21, searches: 96 },
  { week: "W6", routes: 24, searches: 120 },
  { week: "W7", routes: 24, searches: 143 },
  { week: "W8", routes: 27, searches: 168 },
];

const MSG_BY_COMPANY = [
  { name: "GUO Transport", value: 38 },
  { name: "ABC Transport", value: 27 },
  { name: "Peace Mass", value: 19 },
  { name: "Others", value: 16 },
];

export default function AdminPage() {
  const [secretInput, setSecretInput] = useState("");
  const [authed, setAuthed] = useState(!!sessionStorage.getItem("admin_secret"));
  const { toast } = useToast();
  const qc = useQueryClient();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem("admin_secret", secretInput);
    setAuthed(true);
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_secret");
    setAuthed(false);
    setSecretInput("");
    qc.clear();
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-primary flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Admin Access</h1>
              <p className="text-xs text-gray-500">ArriveLink Control Panel</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="secret">Admin Secret</Label>
              <Input
                id="secret"
                type="password"
                placeholder="Enter admin secret"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">Sign In to Admin</Button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            Default: arrivelink-admin
          </p>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} toast={toast} />;
}

function AdminDashboard({
  onLogout,
  toast,
}: {
  onLogout: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState("dashboard");

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminFetch("/admin/stats"),
    retry: false,
  });

  if (statsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center max-w-sm">
          <ShieldCheck className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 mb-1">Authentication Failed</p>
          <p className="text-sm text-gray-500 mb-4">Wrong admin secret.</p>
          <Button onClick={onLogout} variant="outline">Try Again</Button>
        </div>
      </div>
    );
  }

  const navItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { key: "companies", label: "Companies", icon: <Building2 className="h-4 w-4" /> },
    { key: "operators", label: "Operators", icon: <UserCog className="h-4 w-4" /> },
  ];

  const bottomNavItems: NavItem[] = [
    { key: "refresh", label: "Refresh Data", icon: <RefreshCw className="h-4 w-4" />, onClick: () => qc.invalidateQueries() },
    { key: "logout", label: "Log Out", icon: <LogOut className="h-4 w-4" />, onClick: onLogout },
  ];

  const sectionTitles: Record<string, string> = {
    dashboard: "Dashboard",
    users: "Users",
    companies: "Companies",
    operators: "Operators",
  };

  return (
    <DashboardShell
      title={sectionTitles[activeSection] ?? "Dashboard"}
      subtitle="Platform overview and management"
      navItems={navItems}
      bottomNavItems={bottomNavItems}
      activeKey={activeSection}
      onNavClick={setActiveSection}
      username="Admin"
      userInitials="AD"
      userRole="Administrator"
      searchPlaceholder="Search users, companies..."
      brandLabel="Admin Portal"
    >
      {activeSection === "dashboard" && (
        <DashboardOverview stats={stats} />
      )}
      {activeSection === "users" && (
        <UsersTab toast={toast} />
      )}
      {activeSection === "companies" && (
        <CompaniesTab toast={toast} />
      )}
      {activeSection === "operators" && (
        <OperatorsTab toast={toast} />
      )}
    </DashboardShell>
  );
}

function DashboardOverview({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats?.total_users ?? 0}
          icon={<Users className="h-5 w-5 text-emerald-700" />}
          iconBg="bg-emerald-50"
          trend={{ value: 12.4, label: "vs last month" }}
        />
        <StatCard
          label="Messages Sent"
          value={stats?.total_messages ?? 0}
          icon={<MessageSquare className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          trend={{ value: 28.7, label: "vs last month" }}
        />
        <StatCard
          label="Companies"
          value={stats?.total_companies ?? 0}
          icon={<Building2 className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          trend={{ value: 5.2, label: "vs last month" }}
        />
        <StatCard
          label="Operators"
          value={stats?.total_operators ?? 0}
          icon={<UserCog className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50"
          trend={{ value: 8.1, label: "vs last month" }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Platform Growth</h3>
              <p className="text-xs text-gray-500 mt-0.5">User registrations & messages over 6 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: CHART_PRIMARY }} />
                Users
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: CHART_SECONDARY }} />
                Messages
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_USERS} barSize={20} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                cursor={{ fill: "#f9fafb" }}
              />
              <Bar dataKey="users" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Users" />
              <Bar dataKey="messages" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Messages by Company</h3>
              <p className="text-xs text-gray-500 mt-0.5">Distribution across operators</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={MSG_BY_COMPANY}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {MSG_BY_COMPANY.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {MSG_BY_COMPANY.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-gray-600 truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-900">Route & Search Activity</h3>
            <p className="text-xs text-gray-500 mt-0.5">Weekly active routes and traveler searches</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-200" />
              Routes Listed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-200" />
              Searches
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={PLATFORM_GROWTH}>
            <defs>
              <linearGradient id="colorRoutes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} />
            <Area type="monotone" dataKey="routes" stroke={CHART_PRIMARY} fill="url(#colorRoutes)" strokeWidth={2} name="Routes Listed" />
            <Area type="monotone" dataKey="searches" stroke={CHART_BLUE} fill="url(#colorSearches)" strokeWidth={2} name="Searches" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function UsersTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["admin-users"],
    queryFn: () => adminFetch("/admin/users"),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => adminFetch(`/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "User removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingPlaceholder />;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Registered Users"
        subtitle={`${data?.length ?? 0} traveler accounts`}
        icon={<Users className="h-5 w-5 text-emerald-700" />}
        iconBg="bg-emerald-50"
      />
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-700">Name</th>
                <th className="text-left p-4 font-semibold text-gray-700">Email</th>
                <th className="text-left p-4 font-semibold text-gray-700">Phone</th>
                <th className="text-left p-4 font-semibold text-gray-700">Conversations</th>
                <th className="text-left p-4 font-semibold text-gray-700">Joined</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!data?.length ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">No users yet</td></tr>
              ) : data.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{u.name}</td>
                  <td className="p-4 text-gray-500">{u.email}</td>
                  <td className="p-4 text-gray-500">{u.phone ?? "—"}</td>
                  <td className="p-4">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-0">
                      {u.conversation_count ?? 0} conversations
                    </Badge>
                  </td>
                  <td className="p-4 text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={() => { if (confirm(`Remove ${u.email}?`)) deleteUser.mutate(u.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompaniesTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["admin-companies"],
    queryFn: () => adminFetch("/admin/companies"),
  });

  const updateCode = useMutation({
    mutationFn: ({ id, code }: { id: number; code: string }) =>
      adminFetch(`/admin/companies/${id}/invite-code`, { method: "PUT", body: JSON.stringify({ invite_code: code }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      setEditingId(null);
      toast({ title: "Invite code updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleVerify = useMutation({
    mutationFn: ({ id, is_verified, featured }: { id: number; is_verified?: boolean; featured?: boolean }) =>
      adminFetch(`/admin/companies/${id}/verify`, { method: "PUT", body: JSON.stringify({ is_verified, featured }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-companies"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingPlaceholder />;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Transport Companies"
        subtitle={`${data?.length ?? 0} companies listed`}
        icon={<Building2 className="h-5 w-5 text-amber-600" />}
        iconBg="bg-amber-50"
      />
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-700">Company</th>
                <th className="text-left p-4 font-semibold text-gray-700">Invite Code</th>
                <th className="text-left p-4 font-semibold text-gray-700">Rating</th>
                <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                <th className="text-left p-4 font-semibold text-gray-700">Featured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{c.name}</td>
                  <td className="p-4">
                    {editingId === c.id ? (
                      <div className="flex items-center gap-2">
                        <Input className="h-7 text-xs w-36" value={editCode}
                          onChange={(e) => setEditCode(e.target.value)} autoFocus />
                        <button className="text-emerald-600 hover:text-emerald-800"
                          onClick={() => updateCode.mutate({ id: c.id, code: editCode })}>
                          <Check className="h-4 w-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600"
                          onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {c.invite_code ?? "—"}
                        </code>
                        <button className="text-gray-400 hover:text-gray-600"
                          onClick={() => { setEditingId(c.id); setEditCode(c.invite_code ?? ""); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-gray-800">{c.rating?.toFixed(1)}</span>
                      <span className="text-gray-400">({c.review_count})</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <button onClick={() => toggleVerify.mutate({ id: c.id, is_verified: !c.is_verified })}>
                      <Badge variant={c.is_verified ? "default" : "secondary"}
                        className={c.is_verified ? "bg-emerald-100 text-emerald-800 border-0 cursor-pointer hover:bg-emerald-200" : "cursor-pointer"}>
                        {c.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </button>
                  </td>
                  <td className="p-4">
                    <button onClick={() => toggleVerify.mutate({ id: c.id, featured: !c.featured })}>
                      <Badge variant={c.featured ? "default" : "secondary"}
                        className={c.featured ? "bg-blue-100 text-blue-800 border-0 cursor-pointer hover:bg-blue-200" : "cursor-pointer"}>
                        {c.featured ? "Featured" : "Standard"}
                      </Badge>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OperatorsTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["admin-operators"],
    queryFn: () => adminFetch("/admin/operators"),
  });

  const deleteOp = useMutation({
    mutationFn: (id: number) => adminFetch(`/admin/operators/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-operators"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Operator removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingPlaceholder />;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Business Operators"
        subtitle={`${data?.length ?? 0} registered operators`}
        icon={<UserCog className="h-5 w-5 text-purple-600" />}
        iconBg="bg-purple-50"
      />
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-700">Email</th>
                <th className="text-left p-4 font-semibold text-gray-700">Company</th>
                <th className="text-left p-4 font-semibold text-gray-700">Joined</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!data?.length ? (
                <tr><td colSpan={4} className="text-center text-gray-400 py-10">No operators yet</td></tr>
              ) : data.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{op.email}</td>
                  <td className="p-4 text-gray-500">{op.company_name ?? "—"}</td>
                  <td className="p-4 text-gray-500">{formatDate(op.created_at)}</td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={() => { if (confirm(`Remove ${op.email}?`)) deleteOp.mutate(op.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon, iconBg }: {
  title: string; subtitle: string; icon: React.ReactNode; iconBg: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>{icon}</div>
      <div>
        <h2 className="font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-12 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
