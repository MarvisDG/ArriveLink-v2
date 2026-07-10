"use client";

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Bus, LogOut, Save, Plus, Trash2, Pencil, CheckCircle2,
  Loader2, Building2, Route, ToggleLeft, ToggleRight,
  LayoutDashboard, MessageSquare, Settings, TrendingUp,
  Star, MapPin, Clock, ChevronLeft, Send, Activity,
  Inbox, BookOpen, ScanLine, Wallet, Check, X, Users, AlertTriangle,
  ArrowRight, Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, LineChart, Line,
} from "recharts";
import {
  DashboardShell, StatCard, NavItem,
  CHART_PRIMARY, CHART_SECONDARY, CHART_BLUE, PIE_COLORS,
} from "@/components/dashboard-shell";

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("operator_token");
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

interface City { id: number; name: string; state: string; }
interface OperatorRoute {
  id: number;
  departure_city: City;
  destination_city: City;
  price: number;
  departure_times: string[];
  terminal_location: string;
  terminal_address: string | null;
  status: string;
  is_active: boolean;
}
interface CompanyProfile {
  id: number; name: string; tagline: string | null; about: string | null;
  founded_year: number | null; fleet_size: number | null;
  rep_whatsapp: string | null; rep_phone: string | null;
  is_verified: boolean; rating: number; review_count: number;
}

const STATUS_OPTIONS = ["available", "delayed", "sold_out", "cancelled"];

const WEEKLY_ENQUIRIES = [
  { day: "Mon", enquiries: 3, views: 12 },
  { day: "Tue", enquiries: 7, views: 23 },
  { day: "Wed", enquiries: 12, views: 31 },
  { day: "Thu", enquiries: 8, views: 27 },
  { day: "Fri", enquiries: 15, views: 44 },
  { day: "Sat", enquiries: 18, views: 56 },
  { day: "Sun", enquiries: 11, views: 38 },
];

const RATING_BREAKDOWN = [
  { name: "Punctuality", value: 84, fill: CHART_PRIMARY },
  { name: "Comfort", value: 78, fill: CHART_SECONDARY },
  { name: "Safety", value: 91, fill: CHART_BLUE },
  { name: "Value", value: 72, fill: "#8b5cf6" },
];

function RouteFormDialog({
  open, onOpenChange, route, cities, onSave, saving,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  route: OperatorRoute | null; cities: City[];
  onSave: (data: Record<string, unknown>) => void; saving: boolean;
}) {
  const [departureCityId, setDepartureCityId] = useState(route ? String(route.departure_city.id) : "");
  const [destinationCityId, setDestinationCityId] = useState(route ? String(route.destination_city.id) : "");
  const [price, setPrice] = useState(route ? String(route.price / 100) : "");
  const [departureTimes, setDepartureTimes] = useState(route ? route.departure_times.join(", ") : "");
  const [terminalLocation, setTerminalLocation] = useState(route?.terminal_location ?? "");
  const [terminalAddress, setTerminalAddress] = useState(route?.terminal_address ?? "");
  const [status, setStatus] = useState(route?.status ?? "available");

  useEffect(() => {
    if (open) {
      setDepartureCityId(route ? String(route.departure_city.id) : "");
      setDestinationCityId(route ? String(route.destination_city.id) : "");
      setPrice(route ? String(route.price / 100) : "");
      setDepartureTimes(route ? route.departure_times.join(", ") : "");
      setTerminalLocation(route?.terminal_location ?? "");
      setTerminalAddress(route?.terminal_address ?? "");
      setStatus(route?.status ?? "available");
    }
  }, [open, route]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const times = departureTimes.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({
      departure_city_id: departureCityId ? parseInt(departureCityId) : undefined,
      destination_city_id: destinationCityId ? parseInt(destinationCityId) : undefined,
      price: price ? Math.round(parseFloat(price) * 100) : undefined,
      departure_times: times,
      terminal_location: terminalLocation,
      terminal_address: terminalAddress || undefined,
      status,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{route ? "Edit Route" : "Add New Route"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!route && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={departureCityId} onValueChange={setDepartureCityId}>
                  <SelectTrigger><SelectValue placeholder="Departure city" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={destinationCityId} onValueChange={setDestinationCityId}>
                  <SelectTrigger><SelectValue placeholder="Destination city" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (₦)</Label>
              <Input type="number" min="0" step="50" placeholder="e.g. 9000"
                value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Departure Times</Label>
            <Input placeholder="e.g. 06:00, 09:00, 14:00"
              value={departureTimes} onChange={(e) => setDepartureTimes(e.target.value)} />
            <p className="text-xs text-muted-foreground">Comma-separated, 24h format (HH:MM)</p>
          </div>
          <div className="space-y-2">
            <Label>Terminal Name</Label>
            <Input placeholder="e.g. Ojota Motor Park"
              value={terminalLocation} onChange={(e) => setTerminalLocation(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Terminal Address <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. 2 Ikorodu Road, Ojota, Lagos"
              value={terminalAddress} onChange={(e) => setTerminalAddress(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {route ? "Save Changes" : "Add Route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function OperatorDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<OperatorRoute | null>(null);

  const { data: meData, isLoading: meLoading, isError: meError } = useQuery<{ company: CompanyProfile }>({
    queryKey: ["operator", "me"],
    queryFn: () => apiFetch("/operator/me"),
    retry: false,
  });

  useEffect(() => {
    if (meError) {
      localStorage.removeItem("operator_token");
      navigate("/business/login");
    }
  }, [meError, navigate]);

  const { data: routes, isLoading: routesLoading } = useQuery<OperatorRoute[]>({
    queryKey: ["operator", "routes"],
    queryFn: () => apiFetch("/operator/me/routes"),
    enabled: !!meData,
  });

  const { data: cities } = useQuery<City[]>({
    queryKey: ["cities"],
    queryFn: () => apiFetch("/cities"),
  });

  const company = meData?.company;

  const [profile, setProfile] = useState<Partial<CompanyProfile>>({});
  useEffect(() => {
    if (company) {
      setProfile({
        tagline: company.tagline ?? "",
        about: company.about ?? "",
        founded_year: company.founded_year ?? undefined,
        fleet_size: company.fleet_size ?? undefined,
        rep_whatsapp: company.rep_whatsapp ?? "",
        rep_phone: company.rep_phone ?? "",
      });
    }
  }, [company]);

  const saveProfileMutation = useMutation({
    mutationFn: (data: Partial<CompanyProfile>) =>
      apiFetch("/operator/me/company", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator", "me"] });
      toast({ title: "Profile saved", description: "Your company profile has been updated." });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const addRouteMutation = useMutation({
    mutationFn: (data: unknown) =>
      apiFetch("/operator/me/routes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator", "routes"] });
      setRouteDialogOpen(false);
      toast({ title: "Route added" });
    },
    onError: (err: Error) => toast({ title: "Failed to add route", description: err.message, variant: "destructive" }),
  });

  const updateRouteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) =>
      apiFetch(`/operator/me/routes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator", "routes"] });
      setRouteDialogOpen(false);
      setEditingRoute(null);
      toast({ title: "Route updated" });
    },
    onError: (err: Error) => toast({ title: "Failed to update route", description: err.message, variant: "destructive" }),
  });

  const deleteRouteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/operator/me/routes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator", "routes"] });
      toast({ title: "Route removed" });
    },
    onError: (err: Error) => toast({ title: "Failed to remove route", description: err.message, variant: "destructive" }),
  });

  const toggleRouteMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      apiFetch(`/operator/me/routes/${id}`, { method: "PUT", body: JSON.stringify({ is_active }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operator", "routes"] }),
    onError: (err: Error) => toast({ title: "Failed to update route", description: err.message, variant: "destructive" }),
  });

  function handleLogout() {
    localStorage.removeItem("operator_token");
    navigate("/business/login");
  }

  function handleSaveRoute(data: Record<string, unknown>) {
    if (editingRoute) updateRouteMutation.mutate({ id: editingRoute.id, data });
    else addRouteMutation.mutate(data);
  }

  if (meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!company) return null;

  const activeRoutes = routes?.filter((r) => r.is_active) ?? [];
  const inactiveRoutes = routes?.filter((r) => !r.is_active) ?? [];
  const routeStatusData = [
    { name: "Active", value: activeRoutes.length, fill: CHART_PRIMARY },
    { name: "Inactive", value: inactiveRoutes.length, fill: "#e5e7eb" },
  ];

  const companyInitials = company.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const { data: pendingRequests } = useQuery<unknown[]>({
    queryKey: ["operator", "booking-requests"],
    queryFn: () => apiFetch("/operator/bookings/requests"),
    enabled: !!meData,
    refetchInterval: 15000,
  });

  const navItems: NavItem[] = [
    { key: "dashboard", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "requests", label: "Requests", icon: <Inbox className="h-4 w-4" />, badge: pendingRequests?.length ?? 0 },
    { key: "bookings", label: "Active Bookings", icon: <BookOpen className="h-4 w-4" /> },
    { key: "boarding", label: "Boarding", icon: <ScanLine className="h-4 w-4" /> },
    { key: "wallet", label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
    { key: "routes", label: "Routes & Pricing", icon: <Route className="h-4 w-4" /> },
    { key: "profile", label: "Company Profile", icon: <Building2 className="h-4 w-4" /> },
  ];

  const bottomNavItems: NavItem[] = [
    { key: "logout", label: "Log Out", icon: <LogOut className="h-4 w-4" />, onClick: handleLogout },
  ];

  const sectionTitles: Record<string, string> = {
    dashboard: "Dashboard",
    requests: "Reservation Requests",
    bookings: "Active Bookings",
    boarding: "Boarding",
    wallet: "Wallet",
    routes: "Routes & Pricing",
    profile: "Company Profile",
    messages: "Messages",
  };

  return (
    <>
      <DashboardShell
        title={sectionTitles[activeSection] ?? "Dashboard"}
        subtitle={company.name}
        navItems={navItems}
        bottomNavItems={bottomNavItems}
        activeKey={activeSection}
        onNavClick={setActiveSection}
        username={company.name.split(" ")[0]}
        userInitials={companyInitials}
        userRole={company.is_verified ? "Verified Operator" : "Operator"}
        searchPlaceholder="Search routes, cities..."
        brandLabel="Business Portal"
      >
        {activeSection === "dashboard" && (
          <OperatorOverview
            company={company}
            routes={routes ?? []}
            activeRoutes={activeRoutes}
            routeStatusData={routeStatusData}
          />
        )}
        {activeSection === "requests" && (
          <RequestsSection companyId={company.id} />
        )}
        {activeSection === "bookings" && (
          <ActiveBookingsSection companyId={company.id} />
        )}
        {activeSection === "boarding" && (
          <BoardingSection companyId={company.id} />
        )}
        {activeSection === "wallet" && (
          <WalletSection companyId={company.id} />
        )}
        {activeSection === "routes" && (
          <RoutesSection
            routes={routes ?? []}
            routesLoading={routesLoading}
            onAdd={() => { setEditingRoute(null); setRouteDialogOpen(true); }}
            onEdit={(r) => { setEditingRoute(r); setRouteDialogOpen(true); }}
            onDelete={(id) => deleteRouteMutation.mutate(id)}
            onToggle={(id, active) => toggleRouteMutation.mutate({ id, is_active: active })}
          />
        )}
        {activeSection === "messages" && (
          <MessagesSection />
        )}
        {activeSection === "profile" && (
          <ProfileSection
            profile={profile}
            setProfile={setProfile}
            onSave={() => saveProfileMutation.mutate(profile)}
            saving={saveProfileMutation.isPending}
            company={company}
          />
        )}
      </DashboardShell>

      <RouteFormDialog
        open={routeDialogOpen}
        onOpenChange={(v) => { setRouteDialogOpen(v); if (!v) setEditingRoute(null); }}
        route={editingRoute}
        cities={cities ?? []}
        onSave={handleSaveRoute}
        saving={addRouteMutation.isPending || updateRouteMutation.isPending}
      />
    </>
  );
}

function OperatorOverview({
  company, routes, activeRoutes, routeStatusData,
}: {
  company: CompanyProfile;
  routes: OperatorRoute[];
  activeRoutes: OperatorRoute[];
  routeStatusData: { name: string; value: number; fill: string }[];
}) {
  return (
    <div className="space-y-6">
      {company.is_verified && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-primary">Verified Business</p>
            <p className="text-xs text-primary/70">Your company profile is verified and trusted by travelers.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Routes"
          value={routes.length}
          icon={<Route className="h-5 w-5 text-emerald-700" />}
          iconBg="bg-emerald-50"
          trend={{ value: 8.3, label: "vs last month" }}
        />
        <StatCard
          label="Active Routes"
          value={activeRoutes.length}
          icon={<Activity className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          trend={{ value: 5.1, label: "vs last month" }}
        />
        <StatCard
          label="Avg Rating"
          value={company.rating.toFixed(1)}
          icon={<Star className="h-5 w-5 text-amber-500" />}
          iconBg="bg-amber-50"
          trend={{ value: 2.4, label: "vs last month" }}
        />
        <StatCard
          label="Reviews"
          value={company.review_count}
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50"
          trend={{ value: 14.7, label: "vs last month" }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Enquiries This Week</h3>
              <p className="text-xs text-gray-500 mt-0.5">Daily traveler messages and profile views</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: CHART_PRIMARY }} />
                Enquiries
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: CHART_SECONDARY }} />
                Views
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={WEEKLY_ENQUIRIES} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="enquiries" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Enquiries" />
              <Bar dataKey="views" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} name="Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Route Status</h3>
            <p className="text-xs text-gray-500 mb-4">Active vs inactive breakdown</p>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={routeStatusData} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                  paddingAngle={3} dataKey="value">
                  {routeStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {routeStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.fill }} />
                  <span className="text-gray-600">{item.name}: <strong>{item.value}</strong></span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Rating Breakdown</h3>
            <p className="text-xs text-gray-500 mb-3">Performance per category (%)</p>
            <div className="space-y-3">
              {RATING_BREAKDOWN.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-semibold text-gray-800">{item.value}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.value}%`, background: item.fill }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoutesSection({
  routes, routesLoading, onAdd, onEdit, onDelete, onToggle,
}: {
  routes: OperatorRoute[];
  routesLoading: boolean;
  onAdd: () => void;
  onEdit: (r: OperatorRoute) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Your Routes</h2>
          <p className="text-sm text-gray-500">Manage prices, times, and availability</p>
        </div>
        <Button onClick={onAdd} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Route
        </Button>
      </div>

      {routesLoading ? (
        <div className="bg-white rounded-xl border shadow-sm p-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : routes.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
          <Route className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <p className="font-medium text-gray-600">No routes yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first route to appear in search results</p>
          <Button onClick={onAdd} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Add Route
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-700">Route</th>
                <th className="text-left p-4 font-semibold text-gray-700">Price</th>
                <th className="text-left p-4 font-semibold text-gray-700">Times</th>
                <th className="text-left p-4 font-semibold text-gray-700">Terminal</th>
                <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {routes.map((route) => (
                <tr key={route.id} className={`hover:bg-gray-50/70 transition-colors ${route.is_active ? "" : "opacity-50"}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-semibold text-gray-900">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      {route.departure_city.name} → {route.destination_city.name}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-primary">
                    ₦{(route.price / 100).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {route.departure_times.slice(0, 3).map((t) => (
                        <span key={t} className="inline-flex items-center gap-0.5 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          <Clock className="h-2.5 w-2.5" />{t}
                        </span>
                      ))}
                      {route.departure_times.length > 3 && (
                        <span className="text-xs text-gray-400">+{route.departure_times.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{route.terminal_location}</td>
                  <td className="p-4">
                    <Badge
                      variant={route.is_active ? "default" : "secondary"}
                      className={`text-xs capitalize ${route.is_active ? "bg-emerald-100 text-emerald-800 border-0" : ""}`}
                    >
                      {route.is_active ? route.status.replace("_", " ") : "inactive"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => onToggle(route.id, !route.is_active)}
                        title={route.is_active ? "Deactivate" : "Activate"}>
                        {route.is_active
                          ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                          : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => onEdit(route)}>
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => { if (confirm("Remove this route?")) onDelete(route.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MessagesSection() {
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const { toast } = useToast();

  const { data: conversations, isLoading } = useQuery<any[]>({
    queryKey: ["operator", "conversations"],
    queryFn: () => apiFetch("/messages/conversations"),
  });

  function openConv(id: number) {
    setActiveConvId(id);
    setLoadingMsgs(true);
    apiFetch(`/messages/conversations/${id}`)
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }

  async function handleReply() {
    if (!reply.trim() || !activeConvId) return;
    setSending(true);
    try {
      const msg = await apiFetch(`/messages/conversations/${activeConvId}/send`, {
        method: "POST", body: JSON.stringify({ body: reply.trim() }),
      });
      setMessages((p) => [...p, msg]);
      setReply("");
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  }

  const activeConv = conversations?.find((c) => c.id === activeConvId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (activeConvId && activeConv) {
    return (
      <div className="bg-white rounded-xl border shadow-sm flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <Button variant="ghost" size="sm" onClick={() => setActiveConvId(null)} className="-ml-2">
            <ChevronLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">
              {activeConv.guest_name ?? "Traveler"}
            </p>
            <p className="text-xs text-gray-500">
              {activeConv.guest_email ?? "Registered user"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loadingMsgs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_type === "company" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender_type === "company"
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-100 text-gray-800"
              }`}>
                <p>{msg.body}</p>
                <p className={`text-[10px] mt-1 ${msg.sender_type === "company" ? "text-primary-foreground/60" : "text-gray-400"}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4 flex gap-2">
          <Input
            className="flex-1"
            placeholder="Type a reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
          />
          <Button size="icon" onClick={handleReply} disabled={sending || !reply.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Traveler Messages</h2>
        <p className="text-sm text-gray-500">Respond to enquiries from travelers</p>
      </div>

      {!conversations?.length ? (
        <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
          <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <p className="font-medium text-gray-600">No messages yet</p>
          <p className="text-sm text-gray-400 mt-1">When travelers message your company, they'll appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm divide-y overflow-hidden">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              onClick={() => openConv(conv.id)}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bus className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">
                  {conv.guest_name ?? "Registered Traveler"}
                </p>
                {conv.last_message && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message}</p>
                )}
              </div>
              {conv.unread_count > 0 && (
                <Badge className="h-5 px-2 text-xs bg-primary text-primary-foreground">
                  {conv.unread_count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileSection({
  profile, setProfile, onSave, saving, company,
}: {
  profile: Partial<CompanyProfile>;
  setProfile: React.Dispatch<React.SetStateAction<Partial<CompanyProfile>>>;
  onSave: () => void;
  saving: boolean;
  company: CompanyProfile;
}) {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="font-bold text-gray-900">Company Profile</h2>
        <p className="text-sm text-gray-500">Information displayed to travelers on your company page</p>
      </div>

      {company.is_verified && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Verified business — travelers trust your listings more
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        <div className="space-y-2">
          <Label>Tagline</Label>
          <Input placeholder="e.g. Safe. Comfortable. On Time."
            value={profile.tagline ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, tagline: e.target.value }))}
            maxLength={120} />
          <p className="text-xs text-gray-400">Short one-liner shown on search results</p>
        </div>

        <div className="space-y-2">
          <Label>About</Label>
          <Textarea placeholder="Tell travelers about your company..."
            value={profile.about ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, about: e.target.value }))}
            rows={4} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Year Founded</Label>
            <Input type="number" min="1900" max={new Date().getFullYear()}
              placeholder="e.g. 1994"
              value={profile.founded_year ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, founded_year: e.target.value ? parseInt(e.target.value) : undefined }))} />
          </div>
          <div className="space-y-2">
            <Label>Fleet Size</Label>
            <Input type="number" min="1" placeholder="e.g. 120"
              value={profile.fleet_size ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, fleet_size: e.target.value ? parseInt(e.target.value) : undefined }))} />
          </div>
        </div>

        <div className="border rounded-xl p-4 bg-amber-50/40 space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-gray-800">Contact Details</h4>
            <p className="text-xs text-gray-500 mt-0.5">Shared with travelers who message your company</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input placeholder="e.g. 2348012345678"
                value={profile.rep_whatsapp ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, rep_whatsapp: e.target.value }))} />
              <p className="text-xs text-gray-400">International format, no +</p>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input placeholder="e.g. 08012345678"
                value={profile.rep_phone ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, rep_phone: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2 px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── BOOKING MANAGEMENT SECTIONS ───────────────────────────────────────────

interface EnrichedBooking {
  id: number;
  status: string;
  traveler_name: string;
  traveler_phone: string;
  seats_requested: number;
  departure_time: string;
  requested_at: string;
  response_deadline: string;
  payment_deadline: string | null;
  route: {
    price: number;
    terminal_location: string;
    departure_city: { name: string } | null;
    destination_city: { name: string } | null;
  } | null;
  company: { name: string } | null;
  ticket: { ticket_code: string } | null;
  total_fare: number;
  convenience_fee: number;
}

function koboToNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

const STATUS_COLORS: Record<string, string> = {
  AWAITING_RESPONSE: "bg-amber-100 text-amber-700 border-amber-200",
  AWAITING_PAYMENT: "bg-blue-100 text-blue-700 border-blue-200",
  TICKET_ISSUED: "bg-green-100 text-green-700 border-green-200",
  BOARDED: "bg-green-200 text-green-800 border-green-300",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED_TIMEOUT: "bg-red-100 text-red-600 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  AWAITING_RESPONSE: "Awaiting Response",
  AWAITING_PAYMENT: "Awaiting Payment",
  TICKET_ISSUED: "Ticket Issued",
  BOARDED: "Boarded",
  REJECTED: "Declined",
  CANCELLED_TIMEOUT: "Expired",
};

function CountdownBadge({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState(
    Math.max(0, new Date(deadline).getTime() - Date.now())
  );
  useEffect(() => {
    const iv = setInterval(
      () => setRemaining(Math.max(0, new Date(deadline).getTime() - Date.now())),
      1000
    );
    return () => clearInterval(iv);
  }, [deadline]);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isUrgent = remaining < 120000;
  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}

function RequestsSection({ companyId }: { companyId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests = [], isLoading, refetch } = useQuery<EnrichedBooking[]>({
    queryKey: ["operator", "booking-req-list", companyId],
    queryFn: () => apiFetch("/operator/bookings/requests"),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!requests.length) return;
    const soonestMs = Math.min(...requests.map((r) => new Date(r.response_deadline).getTime()));
    const msUntil = soonestMs - Date.now();
    if (msUntil <= 0) { refetch(); return; }
    const timer = setTimeout(() => refetch(), msUntil + 600);
    return () => clearTimeout(timer);
  }, [requests, refetch]);

  const acceptMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/operator/bookings/requests/${id}/accept`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator"] });
      toast({ title: "Request accepted", description: "Traveler notified to complete payment." });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/operator/bookings/requests/${id}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator"] });
      toast({ title: "Request declined" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Incoming Requests</h2>
          <p className="text-sm text-gray-500">
            Respond within 10 minutes — unanswered requests expire automatically
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
          <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-600">No pending requests</p>
          <p className="text-sm text-gray-400 mt-1">New reservation requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-bold text-base">{req.traveler_name}</span>
                    <span className="text-sm text-gray-500">{req.traveler_phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <span className="font-medium">{req.route?.departure_city?.name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium">{req.route?.destination_city?.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Departs {req.departure_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {req.seats_requested} seat{req.seats_requested > 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {req.route?.terminal_location}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {koboToNaira(req.total_fare)} total
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Expires in <CountdownBadge deadline={req.response_deadline} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate(req.id)}
                    >
                      <X className="h-4 w-4 mr-1" /> Decline
                    </Button>
                    <Button
                      size="sm"
                      disabled={acceptMutation.isPending}
                      onClick={() => acceptMutation.mutate(req.id)}
                    >
                      <Check className="h-4 w-4 mr-1" /> Accept
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveBookingsSection({ companyId }: { companyId: number }) {
  const { data: bookings = [], isLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["operator", "active-bookings", companyId],
    queryFn: () => apiFetch("/operator/bookings/active"),
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Active Bookings</h2>
        <p className="text-sm text-gray-500">
          Confirmed reservations awaiting payment or ticket issuance
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-600">No active bookings</p>
          <p className="text-sm text-gray-400 mt-1">
            Accepted reservations appear here after travelers pay
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-600">Traveler</th>
                <th className="text-left p-4 font-semibold text-gray-600">Route</th>
                <th className="text-left p-4 font-semibold text-gray-600">Departs</th>
                <th className="text-left p-4 font-semibold text-gray-600">Seats</th>
                <th className="text-left p-4 font-semibold text-gray-600">Status</th>
                <th className="text-left p-4 font-semibold text-gray-600">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50">
                  <td className="p-4">
                    <p className="font-medium">{b.traveler_name}</p>
                    <p className="text-xs text-gray-400">{b.traveler_phone}</p>
                  </td>
                  <td className="p-4 text-gray-600">
                    {b.route?.departure_city?.name} → {b.route?.destination_city?.name}
                  </td>
                  <td className="p-4 font-mono text-gray-700">{b.departure_time}</td>
                  <td className="p-4 text-gray-600">{b.seats_requested}</td>
                  <td className="p-4">
                    <Badge className={`border text-xs ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </Badge>
                    {b.status === "AWAITING_PAYMENT" && b.payment_deadline && (
                      <div className="mt-0.5">
                        <CountdownBadge deadline={b.payment_deadline} />
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {b.ticket ? (
                      <span className="font-mono text-xs font-bold text-primary">
                        {b.ticket.ticket_code}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BoardingSection({ companyId }: { companyId: number }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<EnrichedBooking | null>(null);
  const [searchError, setSearchError] = useState("");
  const [boarding, setBoarding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    setSearchError("");
    try {
      const data = await apiFetch(
        `/operator/bookings/search?q=${encodeURIComponent(query.trim())}`
      );
      setResult(data);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "No booking found");
    } finally {
      setSearching(false);
    }
  }

  async function handleBoard() {
    if (!result) return;
    setBoarding(true);
    try {
      const updated = await apiFetch(`/operator/bookings/${result.id}/board`, {
        method: "POST",
      });
      setResult(updated);
      queryClient.invalidateQueries({ queryKey: ["operator"] });
      toast({
        title: "Traveler boarded",
        description: `${result.traveler_name} confirmed boarded.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBoarding(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Boarding Confirmation</h2>
        <p className="text-sm text-gray-500">
          Search by ticket code, traveler name, or phone number
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="e.g. AL-2026-DEMO1 or traveler name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {searchError}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">{result.traveler_name}</h3>
              <p className="text-sm text-gray-500">{result.traveler_phone}</p>
            </div>
            <Badge className={`border ${STATUS_COLORS[result.status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABELS[result.status] ?? result.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Route</p>
              <p className="font-medium">
                {result.route?.departure_city?.name} → {result.route?.destination_city?.name}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Departure</p>
              <p className="font-medium font-mono">{result.departure_time}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Seats</p>
              <p className="font-medium">{result.seats_requested}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Ticket Code</p>
              <p className="font-bold font-mono text-primary">
                {result.ticket?.ticket_code ?? "—"}
              </p>
            </div>
          </div>

          {result.status === "TICKET_ISSUED" && (
            <Button
              className="w-full h-11 font-semibold"
              onClick={handleBoard}
              disabled={boarding}
            >
              {boarding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm Boarding
            </Button>
          )}
          {result.status === "BOARDED" && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="font-medium">Traveler confirmed boarded</span>
            </div>
          )}
          {result.status === "AWAITING_PAYMENT" && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">
                Traveler has not yet completed payment
              </span>
            </div>
          )}
          {result.status === "CANCELLED_TIMEOUT" && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-xl px-4 py-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">
                This booking expired and was cancelled
              </span>
            </div>
          )}
        </div>
      )}

      {!result && !searchError && !searching && (
        <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
          <ScanLine className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-600">Search for a traveler</p>
          <p className="text-sm text-gray-400 mt-1">
            Enter ticket code, name, or phone number above
          </p>
        </div>
      )}
    </div>
  );
}

function WalletSection({ companyId }: { companyId: number }) {
  const { data: wallet, isLoading } = useQuery<{
    pending_balance: number;
    available_balance: number;
    recent_transactions: EnrichedBooking[];
  }>({
    queryKey: ["operator", "wallet", companyId],
    queryFn: () => apiFetch("/operator/wallet"),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const pending = wallet?.pending_balance ?? 0;
  const available = wallet?.available_balance ?? 0;
  const total = pending + available;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-gray-900">Wallet &amp; Earnings</h2>
        <p className="text-sm text-gray-500">
          Pending funds settle after boarding confirmation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Total Earnings</p>
          <p className="text-2xl font-bold text-gray-900">{koboToNaira(total)}</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <p className="text-xs text-primary/70 mb-1 uppercase tracking-wider">Available</p>
          <p className="text-2xl font-bold text-primary">{koboToNaira(available)}</p>
          <p className="text-xs text-primary/60 mt-1">Ready for withdrawal</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-xs text-amber-700/70 mb-1 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{koboToNaira(pending)}</p>
          <p className="text-xs text-amber-600/70 mt-1">Awaiting boarding confirmation</p>
        </div>
      </div>

      {available > 0 && (
        <Button
          className="gap-2"
          onClick={() =>
            alert("Withdrawal requests will be processed within 24 hours.")
          }
        >
          <Wallet className="h-4 w-4" /> Request Withdrawal
        </Button>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
        </div>
        {!wallet?.recent_transactions?.length ? (
          <div className="p-16 text-center">
            <Ticket className="h-8 w-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-600">Traveler</th>
                <th className="text-left p-4 font-semibold text-gray-600">Route</th>
                <th className="text-left p-4 font-semibold text-gray-600">Status</th>
                <th className="text-right p-4 font-semibold text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wallet.recent_transactions.map((t) => {
                const fare = (t.route?.price ?? 0) * t.seats_requested;
                return (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-medium">{t.traveler_name}</p>
                      <p className="text-xs text-gray-400">Booking #{t.id}</p>
                    </td>
                    <td className="p-4 text-gray-600">
                      {t.route?.departure_city?.name} → {t.route?.destination_city?.name}
                    </td>
                    <td className="p-4">
                      <Badge className={`border text-xs ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-semibold">{koboToNaira(fare)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
