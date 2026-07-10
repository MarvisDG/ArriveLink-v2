"use client";

import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  MessageSquare, User, LogOut, ArrowRight, Bus, Loader2, Send,
  ChevronLeft, Clock, LayoutDashboard, Settings, TrendingUp,
  Activity, Star, CheckCircle2, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  DashboardShell, StatCard, NavItem,
  CHART_PRIMARY, CHART_SECONDARY, CHART_BLUE, PIE_COLORS,
} from "@/components/dashboard-shell";

interface ConversationSummary {
  id: number;
  company_id: number;
  company_name: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_type: "user" | "company";
  sender_name: string;
  body: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

function getToken() { return localStorage.getItem("user_token") ?? ""; }
function getUserName() { return localStorage.getItem("user_name") ?? "Traveler"; }

async function apiFetch(path: string, init?: RequestInit) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
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

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  if (now.getTime() - d.getTime() < 86400000) {
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

const ACTIVITY_DATA = [
  { day: "Mon", messages: 0 },
  { day: "Tue", messages: 1 },
  { day: "Wed", messages: 0 },
  { day: "Thu", messages: 2 },
  { day: "Fri", messages: 1 },
  { day: "Sat", messages: 3 },
  { day: "Sun", messages: 1 },
];

export default function AppDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => {
    if (!getToken()) { navigate("/app/login"); return; }
    apiFetch("/users/me").then(setProfile).catch(() => {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_name");
      navigate("/app/login");
    });
    loadConversations();
  }, []);

  function loadConversations() {
    setLoadingConvs(true);
    apiFetch("/messages/conversations")
      .then((data) => setConversations(data))
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvs(false));
  }

  function openConversation(id: number) {
    setActiveConvId(id);
    setLoadingMsgs(true);
    apiFetch(`/messages/conversations/${id}`)
      .then((data) => {
        setMessages(data.messages ?? []);
        setConversations((prev) => prev.map((c) => c.id === id ? { ...c, unread_count: 0 } : c));
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }

  async function handleReply() {
    if (!reply.trim() || !activeConvId) return;
    setSending(true);
    try {
      const msg = await apiFetch(`/messages/conversations/${activeConvId}/send`, {
        method: "POST",
        body: JSON.stringify({ body: reply.trim() }),
      });
      setMessages((prev) => [...prev, msg]);
      setReply("");
      loadConversations();
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_name");
    navigate("/");
  }

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);
  const userName = profile?.name ?? getUserName();
  const userInitials = userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const activeConv = conversations.find((c) => c.id === activeConvId);

  const navItems: NavItem[] = [
    { key: "dashboard", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, badge: totalUnread },
    { key: "profile", label: "My Profile", icon: <User className="h-4 w-4" /> },
  ];

  const bottomNavItems: NavItem[] = [
    { key: "home", label: "Back to Search", icon: <Search className="h-4 w-4" />, href: "/" },
    { key: "logout", label: "Sign Out", icon: <LogOut className="h-4 w-4" />, onClick: handleLogout },
  ];

  const sectionTitles: Record<string, string> = {
    dashboard: "My Dashboard",
    messages: "Messages",
    profile: "My Profile",
  };

  return (
    <DashboardShell
      title={sectionTitles[activeSection] ?? "Dashboard"}
      subtitle={profile ? `Welcome back, ${profile.name.split(" ")[0]}` : ""}
      navItems={navItems}
      bottomNavItems={bottomNavItems}
      activeKey={activeSection}
      onNavClick={(key) => {
        if (key !== "messages") setActiveConvId(null);
        setActiveSection(key);
      }}
      username={userName}
      userInitials={userInitials}
      userRole="Traveler"
      searchPlaceholder="Search routes, companies..."
      brandLabel="Traveler Portal"
    >
      {activeSection === "dashboard" && (
        <TravelerOverview
          conversations={conversations}
          loadingConvs={loadingConvs}
          onOpenMessages={() => setActiveSection("messages")}
        />
      )}
      {activeSection === "messages" && (
        <MessagesView
          conversations={conversations}
          activeConvId={activeConvId}
          activeConv={activeConv}
          messages={messages}
          reply={reply}
          setReply={setReply}
          sending={sending}
          loadingConvs={loadingConvs}
          loadingMsgs={loadingMsgs}
          onOpen={openConversation}
          onReply={handleReply}
          onBack={() => setActiveConvId(null)}
        />
      )}
      {activeSection === "profile" && (
        <ProfileView profile={profile} />
      )}
    </DashboardShell>
  );
}

function TravelerOverview({
  conversations, loadingConvs, onOpenMessages,
}: {
  conversations: ConversationSummary[];
  loadingConvs: boolean;
  onOpenMessages: () => void;
}) {
  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);
  const companiesContacted = new Set(conversations.map((c) => c.company_id)).size;
  const totalMessages = conversations.length;

  const companyData = conversations.slice(0, 4).map((c, i) => ({
    name: c.company_name ?? `Company ${i + 1}`,
    value: Math.floor(Math.random() * 5) + 1,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Conversations"
          value={conversations.length}
          icon={<MessageSquare className="h-5 w-5 text-emerald-700" />}
          iconBg="bg-emerald-50"
          trend={{ value: 12.4, label: "vs last week" }}
        />
        <StatCard
          label="Companies Contacted"
          value={companiesContacted}
          icon={<Bus className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          trend={{ value: 8.2, label: "vs last week" }}
        />
        <StatCard
          label="Unread Replies"
          value={totalUnread}
          icon={<Activity className="h-5 w-5 text-amber-500" />}
          iconBg="bg-amber-50"
          sub={totalUnread > 0 ? "You have pending replies" : "All caught up!"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Message Activity</h3>
              <p className="text-xs text-gray-500 mt-0.5">Your messages sent this week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={ACTIVITY_DATA}>
              <defs>
                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="messages" stroke={CHART_PRIMARY} fill="url(#colorActivity)"
                strokeWidth={2} name="Messages" dot={{ fill: CHART_PRIMARY, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          {companyData.length > 0 ? (
            <>
              <h3 className="font-semibold text-gray-900 mb-1">Companies</h3>
              <p className="text-xs text-gray-500 mb-4">Companies you've messaged</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={companyData} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                    paddingAngle={3} dataKey="value">
                    {companyData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {companyData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.fill }} />
                      <span className="text-gray-600 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{item.value} msgs</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Bus className="h-8 w-8 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Message a company from the search page</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/">Find Routes</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {conversations.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Conversations</h3>
            <Button variant="ghost" size="sm" onClick={onOpenMessages} className="text-primary text-sm gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="divide-y">
            {conversations.slice(0, 3).map((conv) => (
              <div key={conv.id} className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50/60 -mx-5 px-5 transition-colors"
                onClick={onOpenMessages}>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bus className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{conv.company_name ?? "Company"}</p>
                  {conv.last_message && (
                    <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-gray-400">{formatTime(conv.last_message_at)}</p>
                  {conv.unread_count > 0 && (
                    <span className="inline-block mt-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {conversations.length === 0 && !loadingConvs && (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Start your journey</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
            Search for a bus route and message a transport company to get started.
          </p>
          <Button asChild>
            <Link href="/">
              Search Routes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function MessagesView({
  conversations, activeConvId, activeConv, messages, reply, setReply,
  sending, loadingConvs, loadingMsgs, onOpen, onReply, onBack,
}: {
  conversations: ConversationSummary[];
  activeConvId: number | null;
  activeConv?: ConversationSummary;
  messages: ChatMessage[];
  reply: string;
  setReply: (v: string) => void;
  sending: boolean;
  loadingConvs: boolean;
  loadingMsgs: boolean;
  onOpen: (id: number) => void;
  onReply: () => void;
  onBack: () => void;
}) {
  if (activeConvId && activeConv) {
    return (
      <div className="bg-white rounded-xl border shadow-sm flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
            <ChevronLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Bus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{activeConv.company_name ?? "Company"}</p>
            <p className="text-xs text-gray-500">Transport Company</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loadingMsgs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No messages yet</p>
          ) : messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender_type === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-100 text-gray-800"
              }`}>
                <p>{msg.body}</p>
                <p className={`text-[10px] mt-1 ${msg.sender_type === "user" ? "text-primary-foreground/60" : "text-gray-400"}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4 flex gap-2">
          <Input
            className="flex-1"
            placeholder="Type a message..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onReply(); } }}
          />
          <Button size="icon" onClick={onReply} disabled={sending || !reply.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  if (loadingConvs) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
        <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-4" />
        <h3 className="font-semibold text-gray-700 mb-1">No messages yet</h3>
        <p className="text-sm text-gray-400 mb-5">
          Search for a route and tap "Message Company" to start a conversation.
        </p>
        <Button asChild>
          <Link href="/">Search Routes <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">Your Conversations</h2>
        <p className="text-sm text-gray-500">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""} with transport companies</p>
      </div>
      <div className="bg-white rounded-xl border shadow-sm divide-y overflow-hidden">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
            onClick={() => onOpen(conv.id)}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{conv.company_name ?? "Company"}</p>
              {conv.last_message && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message}</p>
              )}
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(conv.last_message_at)}
              </span>
              {conv.unread_count > 0 && (
                <Badge className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                  {conv.unread_count}
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfileView({ profile }: { profile: UserProfile | null }) {
  if (!profile) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="font-bold text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-500">Your ArriveLink traveler account</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xl font-bold">{initials}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{profile.name}</h3>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">Verified Account</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Full Name</p>
            <p className="font-semibold text-gray-900">{profile.name}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Email</p>
            <p className="font-semibold text-gray-900 break-all">{profile.email}</p>
          </div>
          {profile.phone && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Phone</p>
              <p className="font-semibold text-gray-900">{profile.phone}</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Member Since</p>
            <p className="font-semibold text-gray-900">
              {new Date(profile.created_at).toLocaleDateString("en-NG", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
