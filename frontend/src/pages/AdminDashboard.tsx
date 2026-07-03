import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, Bell, Bot, Box, Bug, Check, ChevronDown, ChevronUp, Clock3, Code2, Database, Download, Edit3, Eye, FileDown, FileText, Flame, Gamepad2, Gauge, Globe, Globe2, Image, Images, KeyRound, Laptop, LayoutDashboard, Lock, LogOut, Mail, MapPin, MessageCircle, Monitor, MousePointerClick, Navigation, Network, Palette, Pin, Plus, Radar, RefreshCw, Route, Router, Save, Search, SearchCheck, Server, ServerCog, Shield, ShieldAlert, ShieldCheck, ShieldHalf, SlidersHorizontal, Smartphone, Tablet, Trash2, Undo2, Upload, UserRound, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../components/common/Toast";
import { apiRequest, clearAdminToken, getApiUrl, getRealtimeUrl } from "../services/api";
import { defaultPortfolioContent, type CmsTrashItem, type CmsTrashType, type MediaLibraryItem, type PortfolioContent, type ServiceItem, type SkillGroup, type SocialLinkItem, type WorkExperience } from "../data/portfolioContent";
import type { ProjectItem } from "../data/projects";

interface AdminSummary {
  totals: {
    contacts: number;
    newContacts: number;
    analyticsEvents: number;
    analyticsEvents24h: number;
    uniqueVisitors: number;
    socEvents: number;
    openThreats: number;
    crmLeads: number;
  };
  recentContacts: Array<{
    id: string;
    name: string;
    email: string;
    subject?: string | null;
    message: string;
    pinned?: boolean;
    status: string;
    visitorId?: string | null;
    ip?: string | null;
    createdAt: string;
  }>;
  recentEvents: Array<{
    id: string;
    type: string;
    path: string;
    visitorId?: string;
    ip?: string;
    createdAt: string;
  }>;
  recentSocEvents: Array<{
    id: string;
    title: string;
    severity: string;
    source: string;
    ip?: string;
    createdAt: string;
    resolvedAt?: string | null;
  }>;
  recentCrmLeads: Array<{
    id: string;
    name: string;
    email: string;
    company?: string;
    status: string;
    createdAt: string;
  }>;
  recentSecurityLogs: Array<{
    id: string;
    eventType: string;
    path: string;
    reason: string;
    ip?: string;
    userAgent?: string | null;
    createdAt: string;
  }>;
  recentAdminSessions: Array<{
    id: string;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
    expiresAt: string;
    revokedAt: string | null;
  }>;
  systemHealth: {
    apiStatus: string;
    databaseStatus: string;
    uptimeSeconds: number;
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      heapPercent: number;
    };
  };
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  source: string;
  status: "new" | "read" | "archived";
  pinned: boolean;
  visitorId: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RealtimeMessage {
  type: string;
  payload: unknown;
}

interface VisitorProfile {
  visitorKey: string;
  visitorId: string | null;
  ip: string | null;
  color: string;
  customName: string | null;
  hostname: string | null;
  flag: "important" | "watchlist" | "safe" | "monitor" | "suspicious" | "blocked";
  notes: string;
  country: string;
  state: string;
  city: string;
  isp: string;
  asn: string;
  ipLatitude: number | null;
  ipLongitude: number | null;
  ipGeoSource: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  browser: string;
  os: string;
  device: string;
  screenResolution: string;
  timezone: string;
  language: string;
  referrer: string;
  firstVisit: string;
  lastVisit: string;
  visitCount: number;
  eventCount: number;
  sessions: Array<{ sessionId: string; visitorId: string | null; browser: string; os: string; device: string; firstSeen: string; lastSeen: string; eventCount: number }>;
  visitDurationMs: number;
  pages: string[];
  resumeDownloaded: boolean;
  projectClicks: Array<{ title: string; category: string | null; createdAt: string }>;
  threatScore: number;
  timeline: Array<{
    id: string;
    type: string;
    path: string;
    createdAt: string;
    projectTitle: string | null;
    browser: string;
    os: string;
    device: string;
    screenResolution: string;
    timezone: string;
    referrer: string;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    locationError: string | null;
    userAgent: string | null;
  }>;
}

type AdminSection = "dashboard" | "cms" | "visitors" | "contacts" | "soc" | "reports" | "profile";
type LocationSource = "gps" | "ip" | "manual";

interface MapTarget {
  source: LocationSource;
  label: string;
  query: string;
  latitude: number | null;
  longitude: number | null;
}

interface AdminGeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface VisitorMapPoint {
  visitor: VisitorProfile;
  x: number;
  y: number;
}

const emptySummary: AdminSummary = {
  totals: {
    contacts: 0,
    newContacts: 0,
    analyticsEvents: 0,
    analyticsEvents24h: 0,
    uniqueVisitors: 0,
    socEvents: 0,
    openThreats: 0,
    crmLeads: 0,
  },
  recentContacts: [],
  recentEvents: [],
  recentSocEvents: [],
  recentCrmLeads: [],
  recentSecurityLogs: [],
  recentAdminSessions: [],
  systemHealth: {
    apiStatus: "unknown",
    databaseStatus: "unknown",
    uptimeSeconds: 0,
    memory: {
      heapUsedMb: 0,
      heapTotalMb: 0,
      heapPercent: 0,
    },
  },
};

const navItems: Array<{ id: AdminSection; label: string; description: string; path: string; icon: ReactNode }> = [
  { id: "dashboard", label: "Dashboard", description: "Overview and live metrics", path: "/admin", icon: <LayoutDashboard size={18} /> },
  { id: "cms", label: "CMS", description: "Portfolio content managers", path: "/admin/cms", icon: <Edit3 size={18} /> },
  { id: "visitors", label: "Visitor Tracking", description: "Map, sessions, and behavior", path: "/admin/visitors", icon: <Globe2 size={18} /> },
  { id: "contacts", label: "Contacts", description: "Messages, leads, and visitor links", path: "/admin/contacts", icon: <Bell size={18} /> },
  { id: "soc", label: "SOC Dashboard", description: "Threat queue and security logs", path: "/admin/soc", icon: <ShieldAlert size={18} /> },
  { id: "reports", label: "Reports", description: "PDF, Excel, CSV exports", path: "/admin/reports", icon: <FileText size={18} /> },
  { id: "profile", label: "Profile", description: "Account and password", path: "/admin/profile", icon: <UserRound size={18} /> },
];

function isAdminSummary(value: unknown): value is AdminSummary {
  return Boolean(value && typeof value === "object" && "totals" in value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function severityClass(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return "bg-red-100 text-red-700";
  if (normalized === "high") return "bg-orange-100 text-orange-700";
  if (normalized === "medium") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function sectionFromPath(pathname: string): AdminSection {
  if (pathname.includes("/cms")) return "cms";
  if (pathname.includes("/visitors")) return "visitors";
  if (pathname.includes("/contacts")) return "contacts";
  if (pathname.includes("/soc")) return "soc";
  if (pathname.includes("/reports")) return "reports";
  if (pathname.includes("/profile")) return "profile";
  return "dashboard";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeSection = sectionFromPath(location.pathname);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [archivedNotifications, setArchivedNotifications] = useState<string[]>([]);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSummary = useCallback(async () => {
    const data = await apiRequest<AdminSummary>("/admin/summary", { auth: true });
    setSummary(data);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    loadSummary().catch((err: Error) => {
      setError(err.message);
      clearAdminToken();
    });
  }, [loadSummary]);

  useEffect(() => {
    const socket = new WebSocket(getRealtimeUrl(), []);
    setRealtimeStatus("connecting");

    socket.addEventListener("open", () => {
      setRealtimeStatus("live");
      socket.send(JSON.stringify({ type: "hello" }));
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as RealtimeMessage;
      if (message.type === "summary.updated" && isAdminSummary(message.payload)) {
        setSummary(message.payload);
        setLastUpdated(new Date());
      }
    });

    socket.addEventListener("close", () => setRealtimeStatus("offline"));
    socket.addEventListener("error", () => {
      setRealtimeStatus("offline");
      loadSummary().catch(() => undefined);
    });

    return () => socket.close();
  }, [loadSummary]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const cards = useMemo(() => {
    const totals = summary?.totals || emptySummary.totals;
    return [
      { label: "Contacts", value: totals.contacts, detail: `${totals.newContacts} new` },
      { label: "Visitors", value: totals.uniqueVisitors, detail: `${totals.analyticsEvents24h} events / 24h` },
      { label: "SOC Events", value: totals.socEvents, detail: `${totals.openThreats} open` },
      { label: "CRM Leads", value: totals.crmLeads, detail: "Pipeline ready" },
    ];
  }, [summary]);

  const notifications = useMemo(() => {
    const currentSummary = summary || emptySummary;
    const latestVisitor = currentSummary.recentEvents[0];
    const latestContact = currentSummary.recentContacts[0];
    const latestSecurityLog = currentSummary.recentSecurityLogs[0];
    const failedLogins = currentSummary.recentSecurityLogs.filter((log) => log.eventType.includes("login") || log.reason.toLowerCase().includes("login")).length;
    const items = [
      {
        id: "toast-notifications",
        title: "Toast Notifications",
        detail: `${currentSummary.totals.newContacts} unread contact messages`,
        severity: currentSummary.totals.newContacts > 0 ? "warning" : "info",
        tone: "bg-cyan-500",
        path: "/admin/contacts",
      },
      {
        id: "security-alerts",
        title: "Security Alerts",
        detail: `${currentSummary.recentSecurityLogs.length} recent security log entries`,
        severity: currentSummary.recentSecurityLogs.length ? "critical" : "info",
        tone: currentSummary.recentSecurityLogs.length ? "bg-red-500" : "bg-emerald-500",
        path: "/admin/soc",
      },
      ...(latestVisitor ? [{
        id: `new-visitor-${latestVisitor.id}`,
        title: "New Visitor",
        detail: `${latestVisitor.visitorId || latestVisitor.ip || "Unknown visitor"} opened ${latestVisitor.path}`,
        severity: "info",
        tone: "bg-blue-500",
        path: "/admin/visitors",
      }] : []),
      ...(latestVisitor ? [{
        id: `new-country-${latestVisitor.id}`,
        title: "New Country",
        detail: latestVisitor.ip ? `Latest visitor IP ${latestVisitor.ip}` : "Visitor location is being collected",
        severity: "info",
        tone: "bg-violet-500",
        path: "/admin/visitors",
      }] : []),
      ...(latestContact ? [{
        id: `contact-message-${latestContact.id}`,
        title: "Contact Message",
        detail: `${latestContact.name} sent a message`,
        severity: "warning",
        tone: "bg-emerald-500",
        path: "/admin/contacts",
      }] : []),
      {
        id: "login-alert",
        title: "Login Alert",
        detail: failedLogins ? `${failedLogins} login-related security events` : "No failed login alerts in the latest logs",
        severity: failedLogins ? "warning" : "info",
        tone: failedLogins ? "bg-amber-500" : "bg-emerald-500",
        path: "/admin/soc",
      },
      {
        id: "password-changed",
        title: "Password Changed",
        detail: latestSecurityLog?.eventType.includes("password") ? latestSecurityLog.reason : "No password change alert in the latest logs",
        severity: latestSecurityLog?.eventType.includes("password") ? "warning" : "info",
        tone: latestSecurityLog?.eventType.includes("password") ? "bg-amber-500" : "bg-slate-500",
        path: "/admin/profile",
      },
      {
        id: "system-status",
        title: "System Status",
        detail: realtimeStatus === "live" ? "Realtime channel is live" : "Realtime channel is offline",
        severity: realtimeStatus === "live" ? "info" : "critical",
        tone: realtimeStatus === "live" ? "bg-emerald-500" : "bg-red-500",
        path: "/admin/soc",
      },
      ...currentSummary.recentContacts.slice(0, 2).map((contact) => ({
        id: `contact-${contact.id}`,
        title: "New contact message",
        detail: `${contact.name} sent a message`,
        severity: "warning",
        tone: "bg-emerald-500",
        path: "/admin/contacts",
      })),
      ...currentSummary.recentSocEvents.slice(0, 2).map((event) => ({
        id: `soc-${event.id}`,
        title: event.title,
        detail: `${event.severity} severity from ${event.source}`,
        severity: event.severity === "critical" || event.severity === "high" ? "critical" : "warning",
        tone: event.severity === "critical" || event.severity === "high" ? "bg-red-500" : "bg-amber-500",
        path: "/admin/soc",
      })),
      ...currentSummary.recentSecurityLogs.slice(0, 2).map((log) => ({
        id: `log-${log.id}`,
        title: "Security alert",
        detail: log.reason,
        severity: "critical",
        tone: "bg-red-500",
        path: "/admin/soc",
      })),
    ].slice(0, 12);
    return items.filter((item) => !archivedNotifications.includes(item.id));
  }, [archivedNotifications, realtimeStatus, summary]);

  const unreadNotificationCount = notifications.filter((item) => !readNotifications.includes(item.id)).length;

  const refreshAdminData = () => {
    setRefreshKey((key) => key + 1);
    loadSummary().catch(() => undefined);
  };

  const handleLogout = () => {
    void apiRequest("/auth/logout", { method: "POST" }).catch(() => undefined);
    clearAdminToken();
    navigate("/admin/login", { replace: true });
  };

  if (error) {
    return (
      <main className="min-h-screen bg-(--bg-primary) px-6 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-(--border) bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-(--text)">Session expired</h1>
          <p className="mt-3 text-(--text-secondary)">{error}</p>
          <button onClick={() => navigate("/login")} className="mt-6 rounded-full bg-(--primary) px-6 py-3 font-medium text-white">
            Back to login
          </button>
        </div>
      </main>
    );
  }

  const currentSummary = summary || emptySummary;

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-(--text)">
      <div className="flex min-h-screen">
        <AdminSidebar
          activeSection={activeSection}
          isOpen={adminMenuOpen}
          onClose={() => setAdminMenuOpen(false)}
          onNavigate={(path) => {
            navigate(path);
            setAdminMenuOpen(false);
          }}
          realtimeStatus={realtimeStatus}
        />

        <section className="min-w-0 flex-1 xl:pl-76">
          <header className="sticky top-0 z-20 border-b border-white/80 bg-white/70 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  className="hamburger-btn flex xl:hidden"
                  onClick={() => setAdminMenuOpen((open) => !open)}
                  aria-label="Toggle admin menu"
                  aria-expanded={adminMenuOpen}
                >
                  <span className={`hamburger-line ${adminMenuOpen ? "line-1-open" : ""}`} />
                  <span className={`hamburger-line ${adminMenuOpen ? "line-2-open" : ""}`} />
                  <span className={`hamburger-line ${adminMenuOpen ? "line-3-open" : ""}`} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">CipherWolf Admin</p>
                  <h1 className="mt-1 truncate text-2xl font-bold text-(--text)">{navItems.find((item) => item.id === activeSection)?.label}</h1>
                </div>
              </div>
              <div className="relative flex items-center gap-2">
	                <button onClick={refreshAdminData} className="grid h-11 w-11 place-items-center rounded-2xl border border-(--border) bg-white text-(--text)" aria-label="Refresh dashboard">
	                  <RefreshCw size={18} />
	                </button>
	                <button onClick={() => setCommandOpen(true)} className="hidden h-11 items-center gap-2 rounded-2xl border border-(--border) bg-white px-4 text-sm font-semibold text-(--text) md:flex" aria-label="Open command palette">
	                  <Search size={17} />
	                  Search
	                  <span className="rounded-lg bg-(--bg-primary) px-2 py-1 text-[10px] font-black text-(--text-secondary)">K</span>
	                </button>
	                <button onClick={() => setNotificationsOpen((open) => !open)} className="relative grid h-11 w-11 place-items-center rounded-2xl border border-(--border) bg-white text-(--text)" aria-label="Open notifications">
                  <Bell size={18} />
                  {unreadNotificationCount > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
                </button>
                <button onClick={handleLogout} className="hidden h-11 items-center gap-2 rounded-2xl border border-(--border) bg-white px-4 text-sm font-semibold text-(--text) sm:flex">
                  <LogOut size={17} />
                  Logout
                </button>
                {notificationsOpen && (
                  <NotificationsMenu
                    notifications={notifications}
                    readIds={readNotifications}
                    onMarkRead={(id) => setReadNotifications((current) => Array.from(new Set([...current, id])))}
                    onArchive={(id) => setArchivedNotifications((current) => Array.from(new Set([...current, id])))}
                    onArchiveAll={() => setArchivedNotifications((current) => Array.from(new Set([...current, ...notifications.map((item) => item.id)])))}
                    onOpen={(item) => {
                      setReadNotifications((current) => Array.from(new Set([...current, item.id])));
                      navigate(item.path);
                      setNotificationsOpen(false);
                    }}
	                  />
	                )}
	              </div>
	            </div>
	          </header>
	          <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={(path) => navigate(path)} />

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <RealtimeStrip realtimeStatus={realtimeStatus} lastUpdated={lastUpdated} />
            {activeSection === "dashboard" && <DashboardView cards={cards} summary={currentSummary} isLoading={!summary} />}
            {activeSection === "cms" && <CmsView />}
            {activeSection === "visitors" && <VisitorsView summary={currentSummary} refreshKey={refreshKey} />}
            {activeSection === "contacts" && <ContactsView refreshKey={refreshKey} />}
            {activeSection === "soc" && <SocView summary={currentSummary} />}
            {activeSection === "reports" && <ReportsView summary={currentSummary} />}
            {activeSection === "profile" && <ProfileView summary={currentSummary} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminSidebar({
  activeSection,
  isOpen,
  onClose,
  onNavigate,
  realtimeStatus,
}: {
  activeSection: AdminSection;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  realtimeStatus: "connecting" | "live" | "offline";
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/35 backdrop-blur-sm transition-opacity xl:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[min(19rem,calc(100vw-1.5rem))] border-r border-white/80 bg-white/88 px-4 py-5 text-(--text) shadow-[18px_0_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-transform duration-300 xl:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="flex items-center justify-between gap-3">
        <AdminBrand />
        <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-(--border) bg-white xl:hidden" aria-label="Close admin menu">
          <X size={18} />
        </button>
      </div>

      <div className="mt-8 px-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-(--text-secondary)">Control Center</p>
      </div>

      <nav className="mt-3 space-y-2">
        {navItems.map((item) => (
          <AdminNavButton key={item.id} item={item} isActive={activeSection === item.id} onClick={() => onNavigate(item.path)} />
        ))}
      </nav>

      <div className="absolute bottom-5 left-4 right-4 rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${realtimeStatus === "live" ? "bg-emerald-500" : realtimeStatus === "connecting" ? "bg-amber-500" : "bg-red-500"}`} />
          <div>
            <p className="text-sm font-bold">Security Interface</p>
            <p className="mt-0.5 text-xs text-(--text-secondary)">{realtimeStatus === "live" ? "Realtime connected" : realtimeStatus === "connecting" ? "Connecting realtime" : "Realtime offline"}</p>
          </div>
        </div>
      </div>
      </aside>
    </>
  );
}

function AdminNavButton({ item, isActive, onClick }: { item: (typeof navItems)[number]; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-3xl px-3 py-3 text-left transition ${
        isActive ? "bg-[#101828] text-white shadow-xl shadow-slate-900/15" : "text-(--text-secondary) hover:bg-(--bg-primary) hover:text-(--text)"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {isActive && <span className="absolute -left-4 h-8 w-1 rounded-r-full bg-cyan-400" />}
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition ${isActive ? "bg-white text-[#101828]" : "bg-white text-(--text-secondary) shadow-sm group-hover:text-(--text)"}`}>
        {item.icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-5">{item.label}</span>
        <span className={`mt-0.5 block truncate text-xs ${isActive ? "text-white/65" : "text-(--text-secondary)"}`}>{item.description}</span>
      </span>
    </button>
  );
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  detail: string;
  path: string;
  createdAt?: string;
}

function CommandPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (path: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const localResults = useMemo<SearchResult[]>(() => navItems.map((item) => ({
    id: item.id,
    type: "section",
    title: item.label,
    detail: item.description,
    path: item.path,
  })), []);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(localResults);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      apiRequest<{ results: SearchResult[] }>(`/admin/search?q=${encodeURIComponent(trimmed)}`, { auth: true })
        .then((data) => setResults([...localResults.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(trimmed.toLowerCase())), ...data.results]))
        .catch(() => setResults(localResults.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(trimmed.toLowerCase()))))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [localResults, open, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 px-4 py-20 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-(--border) px-4 py-3">
          <Search size={18} className="text-(--text-secondary)" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search visitors, projects, messages, reports, logs" className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-(--text) outline-none" />
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-2xl bg-(--bg-primary)" aria-label="Close search">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[26rem] overflow-y-auto p-3">
          {loading && <p className="px-3 py-2 text-sm font-semibold text-(--text-secondary)">Searching...</p>}
          {!loading && results.length === 0 && <p className="px-3 py-2 text-sm font-semibold text-(--text-secondary)">No matches found.</p>}
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => {
                onNavigate(result.path);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-(--bg-primary)"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#101828] text-white">
                {result.type === "security" ? <ShieldAlert size={16} /> : result.type === "visitor" ? <Globe2 size={16} /> : result.type === "message" ? <Mail size={16} /> : <SearchCheck size={16} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-(--text)">{result.title}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-(--text-secondary)">{result.type} / {result.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type CmsManager = "hero" | "about" | "work" | "skills" | "services" | "projects" | "resume" | "media" | "social" | "contact" | "seo" | "settings" | "trash" | "backups";
type CmsUpdateContent = (updater: (draft: PortfolioContent) => void, undo?: { title: string; message: string }) => void;

const cmsManagers: Array<{ id: CmsManager; label: string; icon: ReactNode }> = [
  { id: "hero", label: "Hero Manager", icon: <Edit3 size={17} /> },
  { id: "about", label: "About Manager", icon: <UserRound size={17} /> },
  { id: "work", label: "Work Experience", icon: <Database size={17} /> },
  { id: "skills", label: "Skills Manager", icon: <ShieldCheck size={17} /> },
  { id: "services", label: "Services Manager", icon: <SlidersHorizontal size={17} /> },
  { id: "projects", label: "Projects Manager", icon: <FileText size={17} /> },
  { id: "resume", label: "Resume Manager", icon: <FileDown size={17} /> },
  { id: "media", label: "Media Library", icon: <Image size={17} /> },
  { id: "social", label: "Social Links", icon: <Globe2 size={17} /> },
  { id: "contact", label: "Contact Manager", icon: <Bell size={17} /> },
  { id: "seo", label: "SEO Manager", icon: <Search size={17} /> },
  { id: "settings", label: "Settings Manager", icon: <Gauge size={17} /> },
  { id: "trash", label: "Trash Manager", icon: <Trash2 size={17} /> },
  { id: "backups", label: "Backup Manager", icon: <Database size={17} /> },
];

function mergeCmsContent(content: PortfolioContent | null): PortfolioContent {
  if (!content) return defaultPortfolioContent;
  return {
    ...defaultPortfolioContent,
    ...content,
    hero: { ...defaultPortfolioContent.hero, ...content.hero },
    about: { ...defaultPortfolioContent.about, ...content.about },
    work: { ...defaultPortfolioContent.work, ...content.work },
    skills: { ...defaultPortfolioContent.skills, ...content.skills },
    projects: { ...defaultPortfolioContent.projects, ...content.projects },
    services: { ...defaultPortfolioContent.services, ...content.services },
    contact: { ...defaultPortfolioContent.contact, ...content.contact },
    resume: { ...defaultPortfolioContent.resume, ...content.resume },
    media: { ...defaultPortfolioContent.media, ...content.media, library: content.media?.library || defaultPortfolioContent.media.library },
    seo: { ...defaultPortfolioContent.seo, ...content.seo },
    settings: { ...defaultPortfolioContent.settings, ...content.settings },
    social: { ...defaultPortfolioContent.social, ...content.social },
    trash: { ...defaultPortfolioContent.trash, ...content.trash },
  };
}

function isValidCmsUrl(value: string) {
  if (!value.trim()) return false;
  if (value.startsWith("#") || value.startsWith("/") || value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("data:")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateCmsContent(content: PortfolioContent) {
  const issues: string[] = [];
  if (!content.hero.name.trim()) issues.push("Hero name is required.");
  if (!content.hero.roles.length) issues.push("Hero needs at least one typing role.");
  if (!content.about.heading.trim()) issues.push("About heading is required.");

  content.skills.groups.forEach((skill, index) => {
    if (!skill.title.trim()) issues.push(`Skill category ${index + 1} needs a title.`);
    if (!skill.tools.length) issues.push(`${skill.title || `Skill category ${index + 1}`} needs at least one skill.`);
  });

  const projectIds = new Set<string>();
  content.projects.items.forEach((project, index) => {
    const label = project.title || `Project ${index + 1}`;
    if (!project.id.trim()) issues.push(`${label} needs a project ID.`);
    if (project.id && projectIds.has(project.id)) issues.push(`${label} has a duplicate project ID.`);
    projectIds.add(project.id);
    if (!project.title.trim()) issues.push(`Project ${index + 1} needs a title.`);
    if (!project.category.trim()) issues.push(`${label} needs a category.`);
    if (!project.image?.trim()) issues.push(`${label} needs an image.`);
    const links = project.links?.length ? project.links : [{ label: project.linkLabel, url: project.link }];
    links.forEach((link) => {
      if (!link.label.trim()) issues.push(`${label} has a link without a label.`);
      if (!isValidCmsUrl(link.url)) issues.push(`${label} has an invalid link URL: ${link.url || "blank"}.`);
    });
  });

  content.services.items.forEach((service, index) => {
    if (!service.title.trim()) issues.push(`Service ${index + 1} needs a title.`);
    if (!service.desc.trim()) issues.push(`${service.title || `Service ${index + 1}`} needs a description.`);
  });

  content.work.experiences.forEach((job, index) => {
    if (!job.role.trim()) issues.push(`Work experience ${index + 1} needs a role.`);
    if (!job.company.trim()) issues.push(`${job.role || `Work experience ${index + 1}`} needs a company.`);
    if (job.highlights.length !== 3) issues.push(`${job.role || `Work experience ${index + 1}`} must have exactly 3 stat cards.`);
  });

  if (!isValidCmsUrl(content.resume.url)) issues.push("Resume download URL is invalid or missing.");
  if (!isValidCmsUrl(content.resume.viewUrl || content.resume.url)) issues.push("Resume view URL is invalid or missing.");

  content.social.links.forEach((link) => {
    if (!link.label.trim()) issues.push("A social link needs a label.");
    if (!isValidCmsUrl(link.url)) issues.push(`${link.label || "Social link"} has an invalid URL.`);
  });

  return issues;
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;
  const [item] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, item);
}

function createTrashItem(type: CmsTrashType, label: string, item: CmsTrashItem["item"]): CmsTrashItem {
  return {
    id: `trash-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label: label || "Untitled item",
    item: structuredClone(item),
    deletedAt: new Date().toISOString(),
  };
}

function createMediaItem(url: string, file?: File, fallbackLabel = "Media item"): MediaLibraryItem {
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: file?.name || fallbackLabel,
    url,
    type: file?.type === "application/pdf" ? "document" : "image",
    createdAt: new Date().toISOString(),
  };
}

const iconOptions: Array<{ name: string; Icon: LucideIcon; group: string }> = [
  { name: "Shield", Icon: Shield, group: "Security" },
  { name: "ShieldHalf", Icon: ShieldHalf, group: "Security" },
  { name: "ShieldCheck", Icon: ShieldCheck, group: "Security" },
  { name: "Network", Icon: Network, group: "Infrastructure" },
  { name: "Router", Icon: Router, group: "Infrastructure" },
  { name: "ServerCog", Icon: ServerCog, group: "Infrastructure" },
  { name: "Database", Icon: Database, group: "Infrastructure" },
  { name: "SearchCheck", Icon: SearchCheck, group: "Security" },
  { name: "Bug", Icon: Bug, group: "Security" },
  { name: "Bot", Icon: Bot, group: "Automation" },
  { name: "Code2", Icon: Code2, group: "Build" },
  { name: "Palette", Icon: Palette, group: "Creative" },
  { name: "Gamepad2", Icon: Gamepad2, group: "Creative" },
  { name: "Box", Icon: Box, group: "Creative" },
  { name: "Globe", Icon: Globe, group: "Social" },
  { name: "Github", Icon: Globe, group: "Social" },
  { name: "Linkedin", Icon: Globe, group: "Social" },
  { name: "Mail", Icon: Mail, group: "Social" },
  { name: "MessageCircle", Icon: MessageCircle, group: "Social" },
  { name: "Instagram", Icon: Globe, group: "Social" },
  { name: "Twitter", Icon: Globe, group: "Social" },
  { name: "Youtube", Icon: Globe, group: "Social" },
];

function getIconPreview(name: string) {
  return iconOptions.find((option) => option.name.toLowerCase() === name.toLowerCase())?.Icon || Shield;
}

function OrderButtons({ index, total, onMove }: { index: number; total: number; onMove: (toIndex: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-white p-1">
      <button
        onClick={() => onMove(index - 1)}
        disabled={index === 0}
        className="grid h-8 w-8 place-items-center rounded-xl text-(--text-secondary) transition enabled:hover:bg-(--bg-primary) disabled:opacity-35"
        aria-label="Move item up"
      >
        <ChevronUp size={16} />
      </button>
      <button
        onClick={() => onMove(index + 1)}
        disabled={index === total - 1}
        className="grid h-8 w-8 place-items-center rounded-xl text-(--text-secondary) transition enabled:hover:bg-(--bg-primary) disabled:opacity-35"
        aria-label="Move item down"
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}

function CmsView() {
  const { showToast, updateToast } = useToast();
  const [activeManager, setActiveManager] = useState<CmsManager>("hero");
  const [content, setContent] = useState<PortfolioContent>(defaultPortfolioContent);
  const [publishedContent, setPublishedContent] = useState<PortfolioContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const validationIssues = useMemo(() => validateCmsContent(content), [content]);
  const hasDraftChanges = useMemo(() => JSON.stringify(content) !== JSON.stringify(publishedContent), [content, publishedContent]);

  useEffect(() => {
    apiRequest<{ content: PortfolioContent | null; updatedAt: string | null }>("/admin/cms", { auth: true })
      .then((data) => {
        const nextContent = mergeCmsContent(data.content);
        setContent(nextContent);
        setPublishedContent(nextContent);
        setUpdatedAt(data.updatedAt);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!hasDraftChanges) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [hasDraftChanges]);

  const openManager = (manager: CmsManager) => {
    if (manager === activeManager) return;
    if (hasDraftChanges && !window.confirm("You have unpublished CMS draft changes. Switch manager anyway?")) {
      showToast("Stayed On Manager", "Draft changes are still open here.", "success");
      return;
    }
    setActiveManager(manager);
  };

  const updateContent: CmsUpdateContent = (updater, undo) => {
    let previousContent: PortfolioContent | null = null;
    setContent((current) => {
      previousContent = structuredClone(current);
      const draft = structuredClone(current);
      updater(draft);
      return draft;
    });
    if (undo && previousContent) {
      showToast(undo.title, undo.message, "success", {
        label: "Undo",
        onClick: () => {
          setContent(previousContent as PortfolioContent);
          showToast("Undo Applied", "The CMS draft was restored to its previous state.", "success");
        },
      });
    }
  };

  const saveContent = async () => {
    if (validationIssues.length > 0) {
      showToast("Validation Failed", `Fix ${validationIssues.length} CMS issue${validationIssues.length === 1 ? "" : "s"} before publishing.`, "error");
      return;
    }
    const toastId = showToast("Saving CMS", "Publishing portfolio changes...", "loading");
    try {
      const data = await apiRequest<{ updatedAt: string }>("/admin/cms", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ content }),
      });
      setUpdatedAt(data.updatedAt);
      setPublishedContent(content);
      localStorage.setItem("portfolio_cms_content", JSON.stringify(content));
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("portfolio-cms");
        channel.postMessage(content);
        channel.close();
      }
      updateToast(toastId, "CMS Saved", "Public portfolio content is updated.", "success");
    } catch (error) {
      updateToast(toastId, "Save Failed", error instanceof Error ? error.message : "Could not save CMS content.", "error");
    }
  };

  const previewDraft = () => {
    localStorage.setItem("portfolio_cms_content", JSON.stringify(content));
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("portfolio-cms");
      channel.postMessage(content);
      channel.close();
    }
    window.open("/", "_blank", "noopener,noreferrer");
    showToast("Preview Ready", "Opened portfolio with the current CMS draft.", "success");
  };

  if (isLoading) {
    return <p className="rounded-3xl border border-(--border) bg-white p-6 text-sm font-semibold text-(--text-secondary)">Loading CMS...</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
      <aside className="hidden rounded-3xl border border-(--border) bg-white p-3 shadow-sm xl:block">
        <div className="px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--text-secondary)">Portfolio CMS</p>
          <p className="mt-2 text-sm text-(--text-secondary)">Everything editable from one control center.</p>
        </div>
        <div className="mt-2 space-y-1">
          {cmsManagers.map((manager) => (
            <button
              key={manager.id}
              onClick={() => openManager(manager.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${
                activeManager === manager.id ? "bg-[#101828] text-white" : "text-(--text-secondary) hover:bg-(--bg-primary) hover:text-(--text)"
              }`}
            >
              {manager.icon}
              {manager.label}
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-3xl border border-(--border) bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 rounded-3xl border border-(--border) bg-(--bg-primary) p-4 xl:hidden">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">Portfolio CMS Manager</span>
            <select
              value={activeManager}
              onChange={(event) => openManager(event.target.value as CmsManager)}
              className="mt-3 w-full rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm font-black text-(--text) outline-none focus:border-(--primary)"
            >
              {cmsManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>{manager.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-4 border-b border-(--border) pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--text-secondary)">Live Portfolio Editor</p>
            <h2 className="mt-1 text-2xl font-black text-(--text)">{cmsManagers.find((manager) => manager.id === activeManager)?.label}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ${hasDraftChanges ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                {hasDraftChanges ? "Draft changes pending" : "Published"}
              </span>
              {validationIssues.length > 0 && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">{validationIssues.length} validation issues</span>}
              {updatedAt && <span className="text-xs font-semibold text-(--text-secondary)">Last saved {formatDate(updatedAt)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={previewDraft} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-(--border) bg-white px-5 py-3 text-sm font-black text-(--text)">
              <Eye size={17} />
              Preview Draft
            </button>
            <button onClick={() => void saveContent()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white">
              <Save size={17} />
              Publish Changes
            </button>
          </div>
        </div>

        {validationIssues.length > 0 && (
          <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-black text-red-700">Fix Before Publishing</p>
            <div className="mt-3 grid gap-2">
              {validationIssues.slice(0, 6).map((issue) => (
                <p key={issue} className="rounded-2xl bg-white px-4 py-2 text-xs font-bold text-red-700">{issue}</p>
              ))}
              {validationIssues.length > 6 && <p className="text-xs font-bold text-red-700">+{validationIssues.length - 6} more issues</p>}
            </div>
          </div>
        )}

        <div className="mt-6">
          {activeManager === "hero" && <HeroManager content={content} updateContent={updateContent} />}
          {activeManager === "about" && <AboutManager content={content} updateContent={updateContent} />}
          {activeManager === "work" && <WorkManager content={content} updateContent={updateContent} />}
          {activeManager === "skills" && <SkillsManager content={content} updateContent={updateContent} />}
          {activeManager === "services" && <ServicesManager content={content} updateContent={updateContent} />}
          {activeManager === "projects" && <ProjectsManager content={content} updateContent={updateContent} />}
          {activeManager === "resume" && <ResumeManager content={content} updateContent={updateContent} />}
          {activeManager === "media" && <MediaManager content={content} updateContent={updateContent} />}
          {activeManager === "social" && <SocialManager content={content} updateContent={updateContent} />}
          {activeManager === "contact" && <SimpleTextManager title="Contact Manager" fields={[["Heading", content.contact.heading], ["Intro", content.contact.intro], ["Location", content.contact.location], ["Email", content.contact.email], ["Phone", content.contact.phone]]} onChange={(index, value) => updateContent((draft) => { const keys = ["heading", "intro", "location", "email", "phone"] as const; draft.contact[keys[index]] = value; })} />}
          {activeManager === "seo" && <SimpleTextManager title="SEO Manager" fields={[["Page title", content.seo.title], ["Meta description", content.seo.description]]} onChange={(index, value) => updateContent((draft) => { if (index === 0) draft.seo.title = value; else draft.seo.description = value; })} />}
          {activeManager === "settings" && <SettingsManager content={content} updateContent={updateContent} />}
          {activeManager === "trash" && <TrashManager content={content} updateContent={updateContent} />}
          {activeManager === "backups" && <BackupManager content={content} setContent={setContent} setUpdatedAt={setUpdatedAt} />}
        </div>
      </section>
    </div>
  );
}

function CmsField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-(--text-secondary)">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="mt-2 w-full rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-semibold text-(--text) outline-none focus:border-(--primary)" />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-semibold text-(--text) outline-none focus:border-(--primary)" />
      )}
    </label>
  );
}

function SimpleTextManager({ title, fields, onChange }: { title: string; fields: Array<[string, string]>; onChange: (index: number, value: string) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black text-(--text)">{title}</h3>
      {fields.map(([label, value], index) => <CmsField key={label} label={label} value={value} multiline={value.length > 90 || label.toLowerCase().includes("intro") || label.toLowerCase().includes("description")} onChange={(next) => onChange(index, next)} />)}
    </div>
  );
}

function ListEditor({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return <CmsField label={label} value={values.join("\n")} multiline onChange={(value) => onChange(value.split("\n").map((item) => item.trim()).filter(Boolean))} />;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function UploadButton({ label, accept, onUpload }: { label: string; accept: string; onUpload: (dataUrl: string, file: File) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm font-black text-(--text) shadow-sm">
      <Upload size={17} />
      {label}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          readFileAsDataUrl(file).then((dataUrl) => onUpload(dataUrl, file)).catch(() => undefined);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const SelectedIcon = getIconPreview(value);
  const filteredIcons = iconOptions.filter((option) => {
    const haystack = `${option.name} ${option.group}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="relative">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-(--text-secondary)">Icon</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-left text-sm font-black text-(--text)"
      >
        <span className="inline-flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-(--text)"><SelectedIcon size={18} /></span>
          <span className="truncate">{value || "Choose icon"}</span>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-3xl border border-(--border) bg-white p-3 shadow-2xl shadow-slate-900/15">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary)" size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search icons" className="h-10 w-full rounded-2xl border border-(--border) bg-(--bg-primary) pl-9 pr-3 text-sm font-semibold outline-none" />
          </label>
          <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {filteredIcons.map(({ name, Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-black transition ${value === name ? "border-[#101828] bg-[#101828] text-white" : "border-(--border) bg-(--bg-primary) text-(--text-secondary) hover:bg-white hover:text-(--text)"}`}
              >
                <Icon size={16} />
                <span className="truncate">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MediaLibraryPicker({ label, value, library, onChange, onUpload }: { label: string; value: string; library: MediaLibraryItem[]; onChange: (value: string) => void; onUpload: (dataUrl: string, file: File) => void }) {
  const [open, setOpen] = useState(false);
  const imageItems = library.filter((item) => item.type === "image");
  return (
    <div className="rounded-2xl border border-(--border) bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-(--text)">{label}</p>
          <p className="mt-1 max-w-xl truncate text-xs font-semibold text-(--text-secondary)">{value || "No image selected"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-black text-(--text)">
            <Images size={17} />
            Pick Image
          </button>
          <UploadButton label="Upload" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" onUpload={onUpload} />
        </div>
      </div>
      {value && <img src={value} alt={`${label} preview`} className="mt-4 h-24 w-36 rounded-2xl object-cover shadow-sm" />}
      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {imageItems.map((item) => (
            <button key={item.id} type="button" onClick={() => { onChange(item.url); setOpen(false); }} className={`overflow-hidden rounded-2xl border text-left transition ${item.url === value ? "border-[#101828] bg-slate-50" : "border-(--border) bg-(--bg-primary) hover:bg-white"}`}>
              <img src={item.url} alt={item.label} className="h-28 w-full object-cover" />
              <span className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-black text-(--text)">
                <span className="truncate">{item.label}</span>
                {item.url === value && <Check size={15} />}
              </span>
            </button>
          ))}
          {!imageItems.length && <p className="rounded-2xl bg-(--bg-primary) p-4 text-sm font-semibold text-(--text-secondary)">Upload an image to start the media library.</p>}
        </div>
      )}
    </div>
  );
}

function RestoreDefaultButton({ label, onRestore }: { label: string; onRestore: () => void }) {
  return (
    <button onClick={onRestore} className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-black text-(--text)">
      <Undo2 size={17} />
      {label}
    </button>
  );
}

function HeroManager({ content, updateContent }: { content: PortfolioContent; updateContent: (updater: (draft: PortfolioContent) => void) => void }) {
  return (
    <div className="space-y-4">
      <CmsField label="Name" value={content.hero.name} onChange={(value) => updateContent((draft) => { draft.hero.name = value; })} />
      <ListEditor label="Typing roles" values={content.hero.roles} onChange={(values) => updateContent((draft) => { draft.hero.roles = values; })} />
      <CmsField label="Intro" value={content.hero.intro} multiline onChange={(value) => updateContent((draft) => { draft.hero.intro = value; })} />
      <ListEditor label="Hero technology tags" values={content.hero.techTags} onChange={(values) => updateContent((draft) => { draft.hero.techTags = values; })} />
      <div className="grid gap-4 md:grid-cols-2">
        <CmsField label="Primary CTA" value={content.hero.primaryCta} onChange={(value) => updateContent((draft) => { draft.hero.primaryCta = value; })} />
        <CmsField label="Secondary CTA" value={content.hero.secondaryCta} onChange={(value) => updateContent((draft) => { draft.hero.secondaryCta = value; })} />
      </div>
    </div>
  );
}

function AboutManager({ content, updateContent }: { content: PortfolioContent; updateContent: (updater: (draft: PortfolioContent) => void) => void }) {
  return (
    <div className="space-y-6">
      <SimpleTextManager title="About Copy" fields={[["Heading", content.about.heading], ["Body", content.about.body]]} onChange={(index, value) => updateContent((draft) => { if (index === 0) draft.about.heading = value; else draft.about.body = value; })} />
      <ListEditor label="Footer info items" values={content.about.info} onChange={(values) => updateContent((draft) => { draft.about.info = values; })} />
      <div className="grid gap-4 lg:grid-cols-2">
        {content.about.cards.map((card, index) => (
          <div key={`${card.title}-${index}`} className="rounded-2xl border border-(--border) bg-(--bg-primary) p-4">
            <CmsField label="Icon text" value={card.emoji} onChange={(value) => updateContent((draft) => { draft.about.cards[index].emoji = value; })} />
            <div className="mt-3"><CmsField label="Title" value={card.title} onChange={(value) => updateContent((draft) => { draft.about.cards[index].title = value; })} /></div>
            <div className="mt-3"><CmsField label="Description" value={card.desc} multiline onChange={(value) => updateContent((draft) => { draft.about.cards[index].desc = value; })} /></div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {content.about.stats.map((stat, index) => (
          <div key={`${stat.label}-${index}`} className="grid gap-3 rounded-2xl border border-(--border) bg-(--bg-primary) p-4 sm:grid-cols-[8rem_1fr]">
            <CmsField label="Value" value={stat.target} onChange={(value) => updateContent((draft) => { draft.about.stats[index].target = value; })} />
            <CmsField label="Label" value={stat.label} onChange={(value) => updateContent((draft) => { draft.about.stats[index].label = value; })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function emptySkill(): SkillGroup {
  return {
    title: "New Skill Group",
    subtitle: "Short category subtitle",
    icon: "Shield",
    tools: ["New skill"],
  };
}

function SkillsManager({ content, updateContent }: { content: PortfolioContent; updateContent: CmsUpdateContent }) {
  const { showToast } = useToast();
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [draftSkill, setDraftSkill] = useState<SkillGroup | null>(null);

  const openEditor = (skill: SkillGroup, index: number | "new") => {
    setEditingIndex(index);
    setDraftSkill(structuredClone(skill));
  };

  const saveDraft = () => {
    if (editingIndex === null || !draftSkill) return;
    updateContent((draft) => {
      if (editingIndex === "new") draft.skills.groups.push(draftSkill);
      else draft.skills.groups[editingIndex] = draftSkill;
    }, { title: editingIndex === "new" ? "Skill Category Added" : "Skill Category Updated", message: `${draftSkill.title} was saved. Undo is available.` });
    setEditingIndex(null);
    setDraftSkill(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            const nextSkill = emptySkill();
            showToast("Creating Skill Category", "New skill category editor opened.", "success");
            setEditingIndex("new");
            setDraftSkill(nextSkill);
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-black text-(--text)"
        >
          <Plus size={17} />
          Add Skill Category
        </button>
        <RestoreDefaultButton label="Restore Default Skills" onRestore={() => { updateContent((draft) => { draft.skills = structuredClone(defaultPortfolioContent.skills); }); showToast("Skills Restored", "Default skills were restored in CMS draft.", "success"); }} />
      </div>
      <SimpleTextManager title="Skills Copy" fields={[["Heading", content.skills.heading], ["Intro", content.skills.intro]]} onChange={(index, value) => updateContent((draft) => { if (index === 0) draft.skills.heading = value; else draft.skills.intro = value; })} />
      <IconGuide />

      <div className="grid gap-4 lg:grid-cols-2">
        {content.skills.groups.map((skill, index) => (
          <article key={`${skill.title}-${index}`} className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">{skill.icon}</p>
                <h3 className="mt-1 text-lg font-black text-(--text)">{skill.title}</h3>
                <p className="mt-1 text-sm font-semibold text-(--text-secondary)">{skill.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <OrderButtons index={index} total={content.skills.groups.length} onMove={(toIndex) => updateContent((draft) => { moveArrayItem(draft.skills.groups, index, toIndex); }, { title: "Order Updated", message: `${skill.title} was moved. Undo is available.` })} />
                <button onClick={() => openEditor(skill, index)} className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-(--text)" aria-label="Edit skill group"><Edit3 size={17} /></button>
                <button onClick={() => updateContent((draft) => { draft.trash.items.unshift(createTrashItem("skill", skill.title, skill)); draft.skills.groups.splice(index, 1); }, { title: "Moved To Trash", message: `${skill.title} was deleted. Undo is available.` })} className="grid h-10 w-10 place-items-center rounded-2xl bg-red-100 text-red-700" aria-label="Delete skill group"><Trash2 size={17} /></button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {skill.tools.slice(0, 8).map((tool) => <span key={tool} className="rounded-full bg-white px-3 py-1 text-xs font-black text-(--text-secondary)">{tool}</span>)}
              {skill.tools.length > 8 && <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-(--text-secondary)">+{skill.tools.length - 8}</span>}
            </div>
          </article>
        ))}
      </div>

      {draftSkill && editingIndex !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-(--border) bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-(--border) pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">Edit Skill Category</p>
                <h3 className="mt-1 text-xl font-black text-(--text)">{draftSkill.title}</h3>
              </div>
              <button onClick={() => { setEditingIndex(null); setDraftSkill(null); showToast("Edit Cancelled", "Skill changes were discarded.", "success"); }} className="grid h-10 w-10 place-items-center rounded-2xl bg-(--bg-primary)" aria-label="Cancel editing"><X size={18} /></button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <CmsField label="Title" value={draftSkill.title} onChange={(value) => setDraftSkill({ ...draftSkill, title: value })} />
              <CmsField label="Subtitle" value={draftSkill.subtitle} onChange={(value) => setDraftSkill({ ...draftSkill, subtitle: value })} />
              <IconPicker value={draftSkill.icon} onChange={(value) => setDraftSkill({ ...draftSkill, icon: value })} />
            </div>
            <div className="mt-4">
              <ListEditor label="Skills, tools, and technologies" values={draftSkill.tools} onChange={(values) => setDraftSkill({ ...draftSkill, tools: values })} />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button onClick={() => { setEditingIndex(null); setDraftSkill(null); showToast("Edit Cancelled", "Skill changes were discarded.", "success"); }} className="rounded-2xl border border-(--border) bg-white px-5 py-3 text-sm font-black text-(--text)">Cancel</button>
              <button onClick={saveDraft} className="inline-flex items-center gap-2 rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white"><Save size={17} />Save Skill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function emptyProject(): ProjectItem {
  return {
    id: `project-${Date.now()}`,
    title: "New Project",
    shortTitle: "New Project",
    category: "Cybersecurity Lab",
    date: new Date().getFullYear().toString(),
    eyebrow: "Featured Project",
    summary: "Short project summary.",
    description: "Long project description.",
    tools: ["Tool"],
    techniques: ["Technique"],
    metrics: [{ value: "1", label: "Metric" }],
    highlights: ["Project highlight."],
    linkLabel: "View Project",
    link: "#portfolio",
    links: [{ label: "View Project", url: "#portfolio" }],
    visual: "network",
    image: "",
    featured: false,
  };
}

function ProjectsManager({ content, updateContent }: { content: PortfolioContent; updateContent: CmsUpdateContent }) {
  const { showToast } = useToast();
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [draftProject, setDraftProject] = useState<ProjectItem | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const projectCategories = Array.from(new Set([...(content.projects.categories || []), ...content.projects.items.map((project) => project.category)]));

  const openProjectEditor = (project: ProjectItem, index: number | "new") => {
    setEditingIndex(index);
    setDraftProject(structuredClone(project));
  };

  const saveProjectDraft = () => {
    if (!draftProject || editingIndex === null) return;
    const normalizedProject = {
      ...draftProject,
      linkLabel: draftProject.links?.[0]?.label || draftProject.linkLabel || "View Project",
      link: draftProject.links?.[0]?.url || draftProject.link || "#portfolio",
    };
    updateContent((draft) => {
      if (!draft.projects.categories.includes(normalizedProject.category)) {
        draft.projects.categories.push(normalizedProject.category);
      }
      if (editingIndex === "new") draft.projects.items.push(normalizedProject);
      else draft.projects.items[editingIndex] = normalizedProject;
    }, { title: editingIndex === "new" ? "Project Added" : "Project Updated", message: `${normalizedProject.title} was saved. Undo is available.` });
    setEditingIndex(null);
    setDraftProject(null);
  };

  const createCategory = () => {
    const clean = newCategory.trim();
    if (!clean) return;
    updateContent((draft) => {
      if (!draft.projects.categories.includes(clean)) draft.projects.categories.push(clean);
    });
    showToast("Category Added", `${clean} was added to project filters.`, "success");
    setNewCategory("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { openProjectEditor(emptyProject(), "new"); showToast("Creating Project", "New project editor opened.", "success"); }} className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-black text-(--text)">
          <Plus size={17} />
          Add Project
        </button>
        <RestoreDefaultButton label="Restore Default Projects" onRestore={() => { updateContent((draft) => { draft.projects = structuredClone(defaultPortfolioContent.projects); }); showToast("Projects Restored", "Default projects were restored in CMS draft.", "success"); }} />
      </div>
      <SimpleTextManager title="Projects Copy" fields={[["Heading", content.projects.heading], ["Intro", content.projects.intro]]} onChange={(index, value) => updateContent((draft) => { if (index === 0) draft.projects.heading = value; else draft.projects.intro = value; })} />

      <div className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
        <h3 className="text-lg font-black text-(--text)">Project Categories</h3>
        <p className="mt-1 text-sm font-semibold text-(--text-secondary)">These categories appear as public portfolio filters.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {projectCategories.map((category) => (
            <span key={category} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-(--text-secondary)">
              {category}
              <button
                onClick={() => updateContent((draft) => {
                  draft.projects.categories = draft.projects.categories.filter((item) => item !== category);
                  showToast("Category Removed", `${category} was removed from the CMS category list.`, "success");
                })}
                aria-label={`Remove ${category}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <CmsField label="Create new category" value={newCategory} onChange={setNewCategory} />
          <button onClick={createCategory} className="self-end rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white">Add Category</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {content.projects.items.map((project, index) => (
          <article key={`${project.id}-${index}`} className="overflow-hidden rounded-3xl border border-(--border) bg-(--bg-primary)">
            {project.image && <img src={project.image} alt={project.title} className="h-44 w-full object-cover" />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">{project.category}</p>
                  <h3 className="mt-1 text-lg font-black text-(--text)">{project.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-(--text-secondary)">{project.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  {project.featured && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Hero</span>}
                  <OrderButtons index={index} total={content.projects.items.length} onMove={(toIndex) => updateContent((draft) => { moveArrayItem(draft.projects.items, index, toIndex); }, { title: "Order Updated", message: `${project.title} was moved. Undo is available.` })} />
                  <button onClick={() => openProjectEditor(project, index)} className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-(--text)" aria-label="Edit project"><Edit3 size={17} /></button>
                  <button onClick={() => updateContent((draft) => { draft.trash.items.unshift(createTrashItem("project", project.title, project)); draft.projects.items.splice(index, 1); }, { title: "Moved To Trash", message: `${project.title} was deleted. Undo is available.` })} className="grid h-10 w-10 place-items-center rounded-2xl bg-red-100 text-red-700" aria-label="Delete project"><Trash2 size={17} /></button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.techniques.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-black text-(--text-secondary)">{tag}</span>)}
              </div>
            </div>
          </article>
        ))}
      </div>

      {draftProject && editingIndex !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-(--border) bg-white p-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border) pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">Edit Project</p>
                <h3 className="mt-1 text-xl font-black text-(--text)">{draftProject.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 rounded-2xl bg-(--bg-primary) px-4 py-3 text-sm font-black text-(--text)">
                  Hero
                  <input type="checkbox" checked={Boolean(draftProject.featured)} onChange={(event) => setDraftProject({ ...draftProject, featured: event.target.checked })} className="h-5 w-5 accent-[#101828]" />
                </label>
                <button onClick={() => { setEditingIndex(null); setDraftProject(null); showToast("Edit Cancelled", "Project changes were discarded.", "success"); }} className="grid h-10 w-10 place-items-center rounded-2xl bg-(--bg-primary)" aria-label="Cancel editing"><X size={18} /></button>
              </div>
            </div>

            <div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <CmsField label="Project ID" value={draftProject.id} onChange={(value) => setDraftProject({ ...draftProject, id: value })} />
                <CmsField label="Title" value={draftProject.title} onChange={(value) => setDraftProject({ ...draftProject, title: value })} />
                <CmsField label="Short title" value={draftProject.shortTitle} onChange={(value) => setDraftProject({ ...draftProject, shortTitle: value })} />
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-(--text-secondary)">Category</span>
                  <select
                    value={projectCategories.includes(draftProject.category) ? draftProject.category : "__new"}
                    onChange={(event) => {
                      if (event.target.value === "__new") {
                        const name = window.prompt("New project category name");
                        if (name?.trim()) setDraftProject({ ...draftProject, category: name.trim() });
                        return;
                      }
                      setDraftProject({ ...draftProject, category: event.target.value });
                    }}
                    className="mt-2 w-full rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-semibold text-(--text) outline-none focus:border-(--primary)"
                  >
                    {projectCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    <option value="__new">Create new category...</option>
                  </select>
                </label>
                <CmsField label="Date" value={draftProject.date} onChange={(value) => setDraftProject({ ...draftProject, date: value })} />
                <CmsField label="Hero tag / eyebrow" value={draftProject.eyebrow} onChange={(value) => setDraftProject({ ...draftProject, eyebrow: value })} />
                <CmsField label="Visual style" value={draftProject.visual} onChange={(value) => setDraftProject({ ...draftProject, visual: value })} />
              </div>

              <div className="mt-4 space-y-3">
                <MediaLibraryPicker
                  label="Project Image"
                  value={draftProject.image || ""}
                  library={content.media.library}
                  onChange={(value) => setDraftProject({ ...draftProject, image: value })}
                  onUpload={(dataUrl, file) => {
                    updateContent((draft) => { draft.media.library.unshift(createMediaItem(dataUrl, file)); });
                    setDraftProject({ ...draftProject, image: dataUrl });
                    showToast("Image Uploaded", "Project image was added to the media library.", "success");
                  }}
                />
                <CmsField label="Image URL or uploaded data" value={draftProject.image || ""} onChange={(value) => setDraftProject({ ...draftProject, image: value })} />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <CmsField label="Summary" value={draftProject.summary} multiline onChange={(value) => setDraftProject({ ...draftProject, summary: value })} />
                <CmsField label="Description" value={draftProject.description} multiline onChange={(value) => setDraftProject({ ...draftProject, description: value })} />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <ListEditor label="Tools" values={draftProject.tools} onChange={(values) => setDraftProject({ ...draftProject, tools: values })} />
                <ListEditor label="Tags / techniques" values={draftProject.techniques} onChange={(values) => setDraftProject({ ...draftProject, techniques: values })} />
                <ListEditor label="Highlights" values={draftProject.highlights} onChange={(values) => setDraftProject({ ...draftProject, highlights: values })} />
              </div>

              <div className="mt-4 rounded-2xl border border-(--border) bg-(--bg-primary) p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-(--text)">Project Metrics</p>
                  <button onClick={() => setDraftProject({ ...draftProject, metrics: [...draftProject.metrics, { value: "1", label: "Metric" }] })} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-(--text)">Add Metric</button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {draftProject.metrics.map((metric, metricIndex) => (
                    <div key={`${metric.label}-${metricIndex}`} className="grid gap-2 rounded-xl bg-white p-3">
                      <CmsField label="Value" value={metric.value} onChange={(value) => setDraftProject({ ...draftProject, metrics: draftProject.metrics.map((item, itemIndex) => itemIndex === metricIndex ? { ...item, value } : item) })} />
                      <CmsField label="Label" value={metric.label} onChange={(value) => setDraftProject({ ...draftProject, metrics: draftProject.metrics.map((item, itemIndex) => itemIndex === metricIndex ? { ...item, label: value } : item) })} />
                      <button onClick={() => setDraftProject({ ...draftProject, metrics: draftProject.metrics.filter((_item, itemIndex) => itemIndex !== metricIndex) })} className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700">Delete Metric</button>
                    </div>
                  ))}
                </div>
              </div>

              <LinksEditor
                links={draftProject.links?.length ? draftProject.links : [{ label: draftProject.linkLabel, url: draftProject.link }]}
                onChange={(links) => setDraftProject({
                  ...draftProject,
                  links,
                  linkLabel: links[0]?.label || "View Project",
                  link: links[0]?.url || "#portfolio",
                })}
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button onClick={() => { setEditingIndex(null); setDraftProject(null); showToast("Edit Cancelled", "Project changes were discarded.", "success"); }} className="rounded-2xl border border-(--border) bg-white px-5 py-3 text-sm font-black text-(--text)">Cancel</button>
              <button onClick={saveProjectDraft} className="inline-flex items-center gap-2 rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white"><Save size={17} />Save Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LinksEditor({ links, onChange }: { links: Array<{ label: string; url: string }>; onChange: (links: Array<{ label: string; url: string }>) => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-(--border) bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-black text-(--text)">Links</p>
        <button onClick={() => onChange([...links, { label: "New Link", url: "https://" }])} className="rounded-xl bg-(--bg-primary) px-3 py-2 text-xs font-black text-(--text)">Add Link</button>
      </div>
      <div className="mt-3 grid gap-3">
        {links.map((link, index) => (
          <div key={`${link.label}-${index}`} className="grid gap-3 rounded-xl bg-(--bg-primary) p-3 md:grid-cols-[1fr_1.4fr_auto]">
            <CmsField label="Label" value={link.label} onChange={(value) => onChange(links.map((item, itemIndex) => itemIndex === index ? { ...item, label: value } : item))} />
            <CmsField label="URL" value={link.url} onChange={(value) => onChange(links.map((item, itemIndex) => itemIndex === index ? { ...item, url: value } : item))} />
            <button onClick={() => onChange(links.filter((_item, itemIndex) => itemIndex !== index))} className="self-end rounded-xl bg-red-100 px-3 py-3 text-xs font-black text-red-700">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function emptyJob(): WorkExperience {
  return {
    role: "New Role",
    company: "Company Name",
    location: "Location",
    period: "Month Year - Month Year",
    type: "Work Type",
    summary: "Short role summary.",
    highlights: [
      { stat: "1", label: "Highlight One", desc: "Describe the first result." },
      { stat: "2", label: "Highlight Two", desc: "Describe the second result." },
      { stat: "3", label: "Highlight Three", desc: "Describe the third result." },
    ],
    achievements: ["Add an achievement."],
    skills: ["Tool or skill"],
  };
}

function WorkManager({ content, updateContent }: { content: PortfolioContent; updateContent: CmsUpdateContent }) {
  const { showToast } = useToast();
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [draftJob, setDraftJob] = useState<WorkExperience | null>(null);

  const normalizeJob = (job: WorkExperience): WorkExperience => ({
    ...job,
    highlights: [...job.highlights, ...emptyJob().highlights].slice(0, 3),
  });

  const openEditor = (job: WorkExperience, index: number | "new") => {
    setEditingIndex(index);
    setDraftJob(normalizeJob(structuredClone(job)));
  };

  const saveJob = () => {
    if (!draftJob || editingIndex === null) return;
    const nextJob = normalizeJob(draftJob);
    updateContent((draft) => {
      if (editingIndex === "new") draft.work.experiences.push(nextJob);
      else draft.work.experiences[editingIndex] = nextJob;
    }, { title: editingIndex === "new" ? "Work Added" : "Work Updated", message: `${nextJob.role} was saved. Undo is available.` });
    setEditingIndex(null);
    setDraftJob(null);
  };

  return (
    <div className="space-y-5">
      <SimpleTextManager title="Work Section" fields={[["Heading", content.work.heading], ["Intro", content.work.intro]]} onChange={(index, value) => updateContent((draft) => { if (index === 0) draft.work.heading = value; else draft.work.intro = value; })} />
      <button onClick={() => { openEditor(emptyJob(), "new"); showToast("Creating Work", "New work experience editor opened.", "success"); }} className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-black text-(--text)">
        <Plus size={17} />
        Add Job
      </button>

      <div className="grid gap-4 lg:grid-cols-2">
        {content.work.experiences.map((job, index) => (
          <article key={`${job.company}-${index}`} className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">{job.type}</p>
                <h3 className="mt-1 text-lg font-black text-(--text)">{job.role}</h3>
                <p className="mt-1 text-sm font-semibold text-(--primary)">{job.company}</p>
                <p className="mt-1 text-xs font-semibold text-(--text-secondary)">{job.period} / {job.location}</p>
              </div>
              <div className="flex items-center gap-2">
                <OrderButtons index={index} total={content.work.experiences.length} onMove={(toIndex) => updateContent((draft) => { moveArrayItem(draft.work.experiences, index, toIndex); }, { title: "Order Updated", message: `${job.role} was moved. Undo is available.` })} />
                <button onClick={() => openEditor(job, index)} className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-(--text)" aria-label="Edit work experience"><Edit3 size={17} /></button>
                <button onClick={() => updateContent((draft) => { draft.trash.items.unshift(createTrashItem("work", job.role, normalizeJob(job))); draft.work.experiences.splice(index, 1); }, { title: "Moved To Trash", message: `${job.role} was deleted. Undo is available.` })} className="grid h-10 w-10 place-items-center rounded-2xl bg-red-100 text-red-700" aria-label="Delete job"><Trash2 size={17} /></button>
              </div>
            </div>
            <p className="mt-4 line-clamp-2 text-sm font-semibold text-(--text-secondary)">{job.summary}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {normalizeJob(job).highlights.map((highlight) => (
                <div key={highlight.label} className="rounded-2xl bg-white p-3">
                  <p className="text-lg font-black text-(--primary)">{highlight.stat}</p>
                  <p className="text-[10px] font-black uppercase text-(--text-secondary)">{highlight.label}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      {draftJob && editingIndex !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-(--border) bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-(--border) pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">Edit Work Experience</p>
                <h3 className="mt-1 text-xl font-black text-(--text)">{draftJob.role}</h3>
              </div>
              <button onClick={() => { setEditingIndex(null); setDraftJob(null); showToast("Edit Cancelled", "Work experience changes were discarded.", "success"); }} className="grid h-10 w-10 place-items-center rounded-2xl bg-(--bg-primary)" aria-label="Cancel editing"><X size={18} /></button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <CmsField label="Role" value={draftJob.role} onChange={(value) => setDraftJob({ ...draftJob, role: value })} />
              <CmsField label="Company" value={draftJob.company} onChange={(value) => setDraftJob({ ...draftJob, company: value })} />
              <CmsField label="Location" value={draftJob.location} onChange={(value) => setDraftJob({ ...draftJob, location: value })} />
              <CmsField label="Period" value={draftJob.period} onChange={(value) => setDraftJob({ ...draftJob, period: value })} />
              <CmsField label="Type" value={draftJob.type} onChange={(value) => setDraftJob({ ...draftJob, type: value })} />
            </div>
            <div className="mt-4"><CmsField label="Summary" value={draftJob.summary} multiline onChange={(value) => setDraftJob({ ...draftJob, summary: value })} /></div>

            <div className="mt-4 rounded-2xl border border-(--border) bg-(--bg-primary) p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-(--text)">Work Stats</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-(--text-secondary)">Exactly 3 stats</span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {normalizeJob(draftJob).highlights.map((highlight, highlightIndex) => (
                  <div key={highlightIndex} className="rounded-2xl bg-white p-4">
                    <CmsField label="Stat" value={highlight.stat} onChange={(value) => setDraftJob({ ...draftJob, highlights: normalizeJob(draftJob).highlights.map((item, itemIndex) => itemIndex === highlightIndex ? { ...item, stat: value } : item) })} />
                    <div className="mt-3"><CmsField label="Label" value={highlight.label} onChange={(value) => setDraftJob({ ...draftJob, highlights: normalizeJob(draftJob).highlights.map((item, itemIndex) => itemIndex === highlightIndex ? { ...item, label: value } : item) })} /></div>
                    <div className="mt-3"><CmsField label="Description" value={highlight.desc} multiline onChange={(value) => setDraftJob({ ...draftJob, highlights: normalizeJob(draftJob).highlights.map((item, itemIndex) => itemIndex === highlightIndex ? { ...item, desc: value } : item) })} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ListEditor label="Achievements" values={draftJob.achievements} onChange={(values) => setDraftJob({ ...draftJob, achievements: values })} />
              <ListEditor label="Technologies and tools" values={draftJob.skills} onChange={(values) => setDraftJob({ ...draftJob, skills: values })} />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button onClick={() => { setEditingIndex(null); setDraftJob(null); showToast("Edit Cancelled", "Work experience changes were discarded.", "success"); }} className="rounded-2xl border border-(--border) bg-white px-5 py-3 text-sm font-black text-(--text)">Cancel</button>
              <button onClick={saveJob} className="inline-flex items-center gap-2 rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white"><Save size={17} />Save Work</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function emptyService(): ServiceItem {
  return { title: "New Service", icon: "ShieldHalf", desc: "Describe the service." };
}

function ServicesManager({ content, updateContent }: { content: PortfolioContent; updateContent: CmsUpdateContent }) {
  const { showToast } = useToast();
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [draftService, setDraftService] = useState<ServiceItem | null>(null);

  const openEditor = (service: ServiceItem, index: number | "new") => {
    setEditingIndex(index);
    setDraftService(structuredClone(service));
  };

  const saveService = () => {
    if (!draftService || editingIndex === null) return;
    updateContent((draft) => {
      if (editingIndex === "new") draft.services.items.push(draftService);
      else draft.services.items[editingIndex] = draftService;
    }, { title: editingIndex === "new" ? "Service Added" : "Service Updated", message: `${draftService.title} was saved. Undo is available.` });
    setEditingIndex(null);
    setDraftService(null);
  };

  return (
    <div className="space-y-5">
      <SimpleTextManager title="Services Copy" fields={[["Heading", content.services.heading], ["Intro", content.services.intro]]} onChange={(index, value) => updateContent((draft) => { if (index === 0) draft.services.heading = value; else draft.services.intro = value; })} />
      <IconGuide />
      <button onClick={() => { openEditor(emptyService(), "new"); showToast("Creating Service", "New service editor opened.", "success"); }} className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-black text-(--text)">
        <Plus size={17} />
        Add Service
      </button>
      <div className="grid gap-4 lg:grid-cols-2">
        {content.services.items.map((service, index) => (
          <article key={`${service.title}-${index}`} className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">{service.icon}</p>
                <h3 className="mt-1 text-lg font-black text-(--text)">{service.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm font-semibold text-(--text-secondary)">{service.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <OrderButtons index={index} total={content.services.items.length} onMove={(toIndex) => updateContent((draft) => { moveArrayItem(draft.services.items, index, toIndex); }, { title: "Order Updated", message: `${service.title} was moved. Undo is available.` })} />
                <button onClick={() => openEditor(service, index)} className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-(--text)" aria-label="Edit service"><Edit3 size={17} /></button>
                <button onClick={() => updateContent((draft) => { draft.trash.items.unshift(createTrashItem("service", service.title, service)); draft.services.items.splice(index, 1); }, { title: "Moved To Trash", message: `${service.title} was deleted. Undo is available.` })} className="grid h-10 w-10 place-items-center rounded-2xl bg-red-100 text-red-700" aria-label="Delete service"><Trash2 size={17} /></button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {draftService && editingIndex !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-(--border) bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-(--border) pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">Edit Service</p>
                <h3 className="mt-1 text-xl font-black text-(--text)">{draftService.title}</h3>
              </div>
              <button onClick={() => { setEditingIndex(null); setDraftService(null); showToast("Edit Cancelled", "Service changes were discarded.", "success"); }} className="grid h-10 w-10 place-items-center rounded-2xl bg-(--bg-primary)" aria-label="Cancel editing"><X size={18} /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <CmsField label="Title" value={draftService.title} onChange={(value) => setDraftService({ ...draftService, title: value })} />
              <IconPicker value={draftService.icon} onChange={(value) => setDraftService({ ...draftService, icon: value })} />
            </div>
            <div className="mt-4"><CmsField label="Description" value={draftService.desc} multiline onChange={(value) => setDraftService({ ...draftService, desc: value })} /></div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button onClick={() => { setEditingIndex(null); setDraftService(null); showToast("Edit Cancelled", "Service changes were discarded.", "success"); }} className="rounded-2xl border border-(--border) bg-white px-5 py-3 text-sm font-black text-(--text)">Cancel</button>
              <button onClick={saveService} className="inline-flex items-center gap-2 rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white"><Save size={17} />Save Service</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MediaManager({ content, updateContent }: { content: PortfolioContent; updateContent: CmsUpdateContent }) {
  const { showToast } = useToast();
  const imageItems = content.media.library.filter((item) => item.type === "image");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <UploadButton label="Upload Image" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" onUpload={(dataUrl, file) => { updateContent((draft) => { draft.media.library.unshift(createMediaItem(dataUrl, file)); draft.media.avatarUrl = dataUrl; }, { title: "Image Uploaded", message: `${file.name || "Image"} was added to the media library. Undo is available.` }); }} />
        <RestoreDefaultButton label="Restore Default Media" onRestore={() => { updateContent((draft) => { draft.media = structuredClone(defaultPortfolioContent.media); }); showToast("Media Restored", "Default media was restored in CMS draft.", "success"); }} />
      </div>
      <MediaLibraryPicker
        label="Avatar Image"
        value={content.media.avatarUrl}
        library={content.media.library}
        onChange={(value) => updateContent((draft) => { draft.media.avatarUrl = value; }, { title: "Avatar Updated", message: "Avatar image was changed. Undo is available." })}
        onUpload={(dataUrl, file) => updateContent((draft) => { draft.media.library.unshift(createMediaItem(dataUrl, file)); draft.media.avatarUrl = dataUrl; }, { title: "Avatar Uploaded", message: `${file.name || "Avatar"} was added to the media library. Undo is available.` })}
      />
      <SimpleTextManager title="Media Library" fields={[["Avatar URL", content.media.avatarUrl]]} onChange={(_index, value) => updateContent((draft) => { draft.media.avatarUrl = value; })} />
      <div className="grid gap-4 lg:grid-cols-3">
        {imageItems.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-3xl border border-(--border) bg-(--bg-primary)">
            <img src={item.url} alt={item.label} className="h-40 w-full object-cover" />
            <div className="space-y-3 p-4">
              <CmsField label="Label" value={item.label} onChange={(value) => updateContent((draft) => { const mediaItem = draft.media.library.find((entry) => entry.id === item.id); if (mediaItem) mediaItem.label = value; })} />
              <div className="flex gap-2">
                <button onClick={() => updateContent((draft) => { draft.media.avatarUrl = item.url; }, { title: "Avatar Updated", message: `${item.label} is now the avatar. Undo is available.` })} className="flex-1 rounded-2xl bg-[#101828] px-4 py-3 text-sm font-black text-white">Use Avatar</button>
                <button onClick={() => updateContent((draft) => { draft.media.library = draft.media.library.filter((mediaItem) => mediaItem.id !== item.id); }, { title: "Media Removed", message: `${item.label} was removed. Undo is available.` })} className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-700" aria-label="Remove media"><Trash2 size={17} /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ResumeManager({ content, updateContent }: { content: PortfolioContent; updateContent: (updater: (draft: PortfolioContent) => void) => void }) {
  const { showToast } = useToast();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <UploadButton
          label="Upload Resume PDF"
          accept="application/pdf"
          onUpload={(dataUrl, file) => {
            updateContent((draft) => {
              draft.resume.url = dataUrl;
              draft.resume.viewUrl = dataUrl;
              draft.resume.downloadName = file.name || draft.resume.downloadName;
            });
            showToast("Resume Uploaded", `${file.name || "Resume"} was added in CMS draft.`, "success");
          }}
        />
        <RestoreDefaultButton label="Restore Default Resume" onRestore={() => { updateContent((draft) => { draft.resume = structuredClone(defaultPortfolioContent.resume); }); showToast("Resume Restored", "Default resume settings were restored in CMS draft.", "success"); }} />
        <a href={content.resume.viewUrl || content.resume.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-[#101828] px-4 py-3 text-sm font-black text-white">
          <Eye size={17} />
          Preview Resume
        </a>
      </div>
      <SimpleTextManager
        title="Resume Button"
        fields={[["Download name", content.resume.downloadName], ["Download URL", content.resume.url], ["View URL", content.resume.viewUrl]]}
        onChange={(index, value) => updateContent((draft) => {
          if (index === 0) draft.resume.downloadName = value;
          else if (index === 1) draft.resume.url = value;
          else draft.resume.viewUrl = value;
        })}
      />
    </div>
  );
}

function emptySocialLink(): SocialLinkItem {
  return { label: "New Link", icon: "Globe", url: "https://" };
}

function SocialManager({ content, updateContent }: { content: PortfolioContent; updateContent: CmsUpdateContent }) {
  const { showToast } = useToast();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { updateContent((draft) => { draft.social.links.push(emptySocialLink()); }); showToast("Social Link Added", "New social link was added in CMS draft.", "success"); }} className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-black text-(--text)">
          <Plus size={17} />
          Add Social Link
        </button>
        <RestoreDefaultButton label="Restore Default Social Links" onRestore={() => { updateContent((draft) => { draft.social = structuredClone(defaultPortfolioContent.social); }); showToast("Social Links Restored", "Default social links were restored in CMS draft.", "success"); }} />
      </div>
      <IconGuide />
      <div className="grid gap-4 lg:grid-cols-2">
        {content.social.links.map((link, index) => (
          <div key={`${link.label}-${index}`} className="rounded-2xl border border-(--border) bg-(--bg-primary) p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-(--text)">{link.label}</p>
              <div className="flex items-center gap-2">
                <OrderButtons index={index} total={content.social.links.length} onMove={(toIndex) => updateContent((draft) => { moveArrayItem(draft.social.links, index, toIndex); }, { title: "Order Updated", message: `${link.label} was moved. Undo is available.` })} />
                <button onClick={() => updateContent((draft) => { draft.trash.items.unshift(createTrashItem("social", link.label, link)); draft.social.links.splice(index, 1); }, { title: "Moved To Trash", message: `${link.label} was deleted. Undo is available.` })} className="grid h-10 w-10 place-items-center rounded-2xl bg-red-100 text-red-700" aria-label="Delete social link"><Trash2 size={17} /></button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <CmsField label="Label" value={link.label} onChange={(value) => updateContent((draft) => { draft.social.links[index].label = value; })} />
              <IconPicker value={link.icon} onChange={(value) => updateContent((draft) => { draft.social.links[index].icon = value; }, { title: "Icon Updated", message: `${link.label} icon was changed. Undo is available.` })} />
            </div>
            <div className="mt-4">
              <CmsField label="URL" value={link.url} onChange={(value) => updateContent((draft) => { draft.social.links[index].url = value; })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconGuide() {
  const iconNames = [
    "Shield",
    "Network",
    "Code2",
    "Palette",
    "Gamepad2",
    "Box",
    "ShieldHalf",
    "Router",
    "ServerCog",
    "SearchCheck",
    "Bug",
    "Database",
    "Globe",
    "Bot",
    "Github",
    "Linkedin",
    "Mail",
    "MessageCircle",
    "Instagram",
    "Twitter",
    "Youtube",
  ];
  return (
    <div className="rounded-2xl border border-(--border) bg-cyan-50 p-4">
      <p className="text-sm font-black text-(--text)">Icon names you can use</p>
      <p className="mt-1 text-xs font-semibold text-(--text-secondary)">Type one of these names in any icon field. Unknown names fall back to a safe default icon.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {iconNames.map((name) => <span key={name} className="rounded-full bg-white px-3 py-1 text-xs font-black text-(--text-secondary)">{name}</span>)}
      </div>
    </div>
  );
}

function TrashManager({ content, updateContent }: { content: PortfolioContent; updateContent: (updater: (draft: PortfolioContent) => void) => void }) {
  const { showToast } = useToast();
  const items = content.trash.items || [];

  const restoreItem = (trashItem: CmsTrashItem, index: number) => {
    updateContent((draft) => {
      draft.trash.items.splice(index, 1);
      if (trashItem.type === "skill") {
        draft.skills.groups.push(trashItem.item as SkillGroup);
      } else if (trashItem.type === "project") {
        const project = trashItem.item as ProjectItem;
        if (!draft.projects.categories.includes(project.category)) draft.projects.categories.push(project.category);
        draft.projects.items.push(project);
      } else if (trashItem.type === "work") {
        draft.work.experiences.push(trashItem.item as WorkExperience);
      } else if (trashItem.type === "service") {
        draft.services.items.push(trashItem.item as ServiceItem);
      } else if (trashItem.type === "social") {
        draft.social.links.push(trashItem.item as SocialLinkItem);
      }
    });
    showToast("Item Restored", `${trashItem.label} was restored to ${trashItem.type}.`, "success");
  };

  const deleteForever = (trashItem: CmsTrashItem, index: number) => {
    if (!window.confirm(`Permanently delete ${trashItem.label}? This cannot be restored from Trash Manager.`)) return;
    updateContent((draft) => {
      draft.trash.items.splice(index, 1);
    });
    showToast("Deleted Forever", `${trashItem.label} was removed from trash.`, "success");
  };

  const clearTrash = () => {
    if (!items.length) return;
    if (!window.confirm("Clear all trash items permanently?")) return;
    updateContent((draft) => {
      draft.trash.items = [];
    });
    showToast("Trash Cleared", "All trash items were permanently removed.", "success");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
        <div>
          <h3 className="text-lg font-black text-(--text)">Trash And Restore</h3>
          <p className="mt-1 text-sm font-semibold text-(--text-secondary)">Deleted CMS items stay here until you restore or permanently remove them.</p>
        </div>
        <button
          onClick={clearTrash}
          disabled={!items.length}
          className="inline-flex items-center gap-2 rounded-2xl bg-red-100 px-4 py-3 text-sm font-black text-red-700 disabled:opacity-40"
        >
          <Trash2 size={17} />
          Clear Trash
        </button>
      </div>

      {!items.length ? (
        <div className="rounded-3xl border border-dashed border-(--border) bg-white p-8 text-center">
          <p className="text-lg font-black text-(--text)">Trash is empty</p>
          <p className="mt-2 text-sm font-semibold text-(--text-secondary)">When you delete skills, projects, services, work experience, or social links, they will appear here first.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((trashItem, index) => (
            <article key={trashItem.id} className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">{trashItem.type}</p>
                  <h3 className="mt-1 text-lg font-black text-(--text)">{trashItem.label}</h3>
                  <p className="mt-1 text-xs font-semibold text-(--text-secondary)">Deleted {formatDate(trashItem.deletedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => restoreItem(trashItem, index)} className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700" aria-label="Restore item"><Undo2 size={17} /></button>
                  <button onClick={() => deleteForever(trashItem, index)} className="grid h-10 w-10 place-items-center rounded-2xl bg-red-100 text-red-700" aria-label="Delete forever"><Trash2 size={17} /></button>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white p-3 text-xs font-bold text-(--text-secondary)">
                Restore sends this item back to the end of its original CMS list. Use the arrow controls there to place it exactly where you want.
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

interface CmsBackup {
  id: string;
  label: string;
  source: string;
  restoredAt: string | null;
  createdAt: string;
}

function BackupManager({ content, setContent, setUpdatedAt }: { content: PortfolioContent; setContent: (content: PortfolioContent) => void; setUpdatedAt: (value: string | null) => void }) {
  const { showToast, updateToast } = useToast();
  const [backups, setBackups] = useState<CmsBackup[]>([]);
  const [label, setLabel] = useState(`Manual backup - ${new Date().toLocaleString()}`);

  const loadBackups = useCallback(async () => {
    const data = await apiRequest<{ backups: CmsBackup[] }>("/admin/cms/backups", { auth: true });
    setBackups(data.backups);
  }, []);

  useEffect(() => {
    loadBackups().catch(() => undefined);
  }, [loadBackups]);

  const createBackup = async () => {
    const toastId = showToast("Creating Backup", "Saving a CMS snapshot...", "loading");
    try {
      await apiRequest("/admin/cms/backups", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ label, source: "manual", content }),
      });
      await loadBackups();
      updateToast(toastId, "Backup Created", "CMS snapshot was saved.", "success");
    } catch (error) {
      updateToast(toastId, "Backup Failed", error instanceof Error ? error.message : "Could not create backup.", "error");
    }
  };

  const restoreBackup = async (id: string) => {
    const toastId = showToast("Restoring Backup", "Replacing CMS content with this snapshot...", "loading");
    try {
      const data = await apiRequest<{ content: PortfolioContent; updatedAt: string }>("/admin/cms/backups/" + encodeURIComponent(id) + "/restore", {
        method: "POST",
        auth: true,
      });
      const nextContent = mergeCmsContent(data.content);
      setContent(nextContent);
      setUpdatedAt(data.updatedAt);
      localStorage.setItem("portfolio_cms_content", JSON.stringify(nextContent));
      await loadBackups();
      updateToast(toastId, "Backup Restored", "Portfolio CMS content was restored.", "success");
    } catch (error) {
      updateToast(toastId, "Restore Failed", error instanceof Error ? error.message : "Could not restore backup.", "error");
    }
  };

  const restoreDefaultAll = () => {
    setContent(structuredClone(defaultPortfolioContent));
    localStorage.setItem("portfolio_cms_content", JSON.stringify(defaultPortfolioContent));
  };

  const sectionButtons = [
    ["Hero", "hero"],
    ["About", "about"],
    ["Work", "work"],
    ["Skills", "skills"],
    ["Projects", "projects"],
    ["Services", "services"],
    ["Resume", "resume"],
    ["Media", "media"],
    ["Social", "social"],
    ["Contact", "contact"],
    ["SEO", "seo"],
    ["Settings", "settings"],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
        <h3 className="text-lg font-black text-(--text)">Create Backup</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <CmsField label="Backup label" value={label} onChange={setLabel} />
          <button onClick={() => void createBackup()} className="self-end inline-flex items-center justify-center gap-2 rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white">
            <Database size={17} />
            Save Backup
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
        <h3 className="text-lg font-black text-(--text)">Restore Defaults</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={restoreDefaultAll} className="inline-flex items-center gap-2 rounded-2xl bg-[#101828] px-4 py-3 text-sm font-black text-white">
            <Undo2 size={17} />
            Restore Full Default
          </button>
          {sectionButtons.map(([labelText, key]) => (
            <button
              key={key}
              onClick={() => setContent({
                ...content,
                [key]: structuredClone(defaultPortfolioContent[key]),
              })}
              className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm font-black text-(--text)"
            >
              {labelText}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
        <h3 className="text-lg font-black text-(--text)">Backup Logs</h3>
        <div className="mt-4 space-y-3">
          {backups.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-(--text-secondary)">No backups saved yet.</p>}
          {backups.map((backup) => (
            <div key={backup.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black text-(--text)">{backup.label}</p>
                <p className="mt-1 text-xs font-semibold text-(--text-secondary)">{backup.source} / {formatDate(backup.createdAt)}{backup.restoredAt ? ` / restored ${formatDate(backup.restoredAt)}` : ""}</p>
              </div>
              <button onClick={() => void restoreBackup(backup.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-black text-(--text)">
                <Undo2 size={17} />
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsManager({ content, updateContent }: { content: PortfolioContent; updateContent: (updater: (draft: PortfolioContent) => void) => void }) {
  const settings = [
    ["showWorkExperience", "Show Work Experience"],
    ["showSkills", "Show Skills"],
    ["showProjects", "Show Projects"],
    ["showServices", "Show Services"],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {settings.map(([key, label]) => (
        <label key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-(--border) bg-(--bg-primary) p-4 text-sm font-black text-(--text)">
          {label}
          <input type="checkbox" checked={content.settings[key]} onChange={(event) => updateContent((draft) => { draft.settings[key] = event.target.checked; })} className="h-5 w-5 accent-[#101828]" />
        </label>
      ))}
    </div>
  );
}

function AdminBrand() {
  return (
    <div className="min-w-0 flex-1 rounded-3xl border border-(--border) bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#101828] text-white shadow-lg shadow-slate-900/15">
          <ShieldAlert size={20} />
        </div>
        <div>
          <p className="text-base font-black tracking-wide text-(--text)">CipherWolf</p>
          <p className="text-xs font-semibold text-(--text-secondary)">Security Platform</p>
        </div>
      </div>
    </div>
  );
}

function RealtimeStrip({ realtimeStatus, lastUpdated }: { realtimeStatus: "connecting" | "live" | "offline"; lastUpdated: Date | null }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-white/80 bg-white/75 p-4 text-sm text-(--text-secondary) shadow-sm backdrop-blur-xl">
      <span className={`h-2.5 w-2.5 rounded-full ${realtimeStatus === "live" ? "bg-emerald-500" : realtimeStatus === "connecting" ? "bg-amber-500" : "bg-red-500"}`} />
      <span>{realtimeStatus === "live" ? "Realtime connected" : realtimeStatus === "connecting" ? "Connecting realtime" : "Realtime offline"}</span>
      {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
    </div>
  );
}

function DashboardView({ summary, isLoading }: { cards: Array<{ label: string; value: number; detail: string }>; summary: AdminSummary; isLoading: boolean }) {
  const securityScore = getSecurityScore(summary);
  const eventTrend = buildHourlyTrend(summary.recentEvents);
  const securityTrend = buildHourlyTrend(summary.recentSecurityLogs);
  const contactTrend = buildHourlyTrend(summary.recentContacts);
  const socTrend = buildHourlyTrend(summary.recentSocEvents);
  const dashboardCards = [
    { label: "Contacts", value: summary.totals.contacts, detail: `${summary.totals.newContacts} unread`, tone: "emerald", icon: <Bell size={18} />, data: contactTrend },
    { label: "Visitors", value: summary.totals.uniqueVisitors, detail: `${summary.totals.analyticsEvents24h} events / 24h`, tone: "blue", icon: <UserRound size={18} />, data: eventTrend },
    { label: "SOC Events", value: summary.totals.socEvents, detail: `${summary.totals.openThreats} open threats`, tone: "red", icon: <ShieldAlert size={18} />, data: socTrend },
    { label: "Security Score", value: securityScore, detail: `${summary.recentSecurityLogs.length} security logs`, tone: "purple", icon: <Gauge size={18} />, data: securityTrend },
  ];

  return (
    <>
      <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl">
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                System {summary.systemHealth.apiStatus}
              </span>
              <span className="rounded-full bg-(--bg-primary) px-3 py-1 text-xs font-bold text-(--text-secondary)">Backend uptime {formatUptime(summary.systemHealth.uptimeSeconds)}</span>
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-(--text) sm:text-4xl">Good Evening, Sai Dinesh</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-(--text-secondary)">A clean operational view of the data actually recorded in your backend: visitors, contacts, SOC events, security logs, reports, and system health.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CommandStatus label="Threat Level" value={summary.totals.openThreats > 2 ? "Elevated" : "Low"} tone={summary.totals.openThreats > 2 ? "amber" : "green"} />
            <CommandStatus label="Events / 24h" value={String(summary.totals.analyticsEvents24h)} tone="blue" />
            <CommandStatus label="API" value={summary.systemHealth.apiStatus} tone="green" />
            <CommandStatus label="Database" value={summary.systemHealth.databaseStatus} tone="green" />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card) => (
          <PremiumMetricCard key={card.label} {...card} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CipherAssistantPanel />
        <CloudflareStatusPanel />
      </section>

      {isLoading ? (
        <p className="py-10 text-(--text-secondary)">Loading admin data...</p>
      ) : (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <ChartPanel title="Traffic Overview" description="Recent portfolio and admin activity">
              <AreaChart data={eventTrend} color="#2563eb" emptyLabel="No visitor events recorded yet." />
            </ChartPanel>
            <VisitorEventsPanel summary={summary} />
            <SecurityLogsPanel summary={summary} />
          </div>
          <div className="space-y-6">
            <ChartPanel title="Threat Distribution" description="Severity mix across SOC detections">
              <DonutChart items={getThreatDistribution(summary)} />
            </ChartPanel>
            <ContactsPanel summary={summary} />
            <SocQueuePanel summary={summary} />
          </div>
        </section>
      )}
    </>
  );
}

interface AssistantResponse {
  answer: string;
  cards: Array<{ label: string; value: string; detail: string }>;
}

function CipherAssistantPanel() {
  const [prompt, setPrompt] = useState("Show today's visitors");
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const quickPrompts = [
    "Show today's visitors",
    "Summarize attack activity",
    "Generate weekly report",
    "Which project gets the most traffic?",
    "Show high-risk visitors",
  ];

  const askAssistant = async (nextPrompt = prompt) => {
    setPrompt(nextPrompt);
    setLoading(true);
    try {
      const data = await apiRequest<AssistantResponse>("/admin/assistant", {
        auth: true,
        method: "POST",
        body: JSON.stringify({ prompt: nextPrompt }),
      });
      setResponse(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#101828] text-white"><Bot size={19} /></span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">Cipher AI</p>
          <h3 className="text-lg font-black text-(--text)">Security assistant</h3>
        </div>
      </div>
      <div className="mt-4 flex gap-2 rounded-2xl border border-(--border) bg-(--bg-primary) p-2">
        <input value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold outline-none" />
        <button onClick={() => void askAssistant()} disabled={loading} className="rounded-xl bg-[#101828] px-4 text-sm font-black text-white disabled:opacity-60">
          {loading ? "..." : "Ask"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {quickPrompts.map((item) => (
          <button key={item} onClick={() => void askAssistant(item)} className="rounded-full bg-(--bg-primary) px-3 py-1.5 text-xs font-black text-(--text-secondary)">
            {item}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-(--bg-primary) p-4">
        <p className="text-sm font-semibold leading-6 text-(--text-secondary)">{response?.answer || "Ask about visitors, attacks, weekly reports, top projects, or high-risk visitors."}</p>
        {response && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {response.cards.slice(0, 3).map((card) => (
              <div key={`${card.label}-${card.value}`} className="rounded-2xl bg-white p-3">
                <p className="truncate text-xs font-bold text-(--text-secondary)">{card.label}</p>
                <p className="mt-1 truncate text-sm font-black text-(--text)">{card.value}</p>
                <p className="mt-1 truncate text-xs text-(--text-secondary)">{card.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface CloudflareStatus {
  connected: boolean;
  status: string;
  dns: boolean;
  ssl: string;
  ddosProtection: string;
  waf: string;
  botProtection: string;
  threatsBlockedToday: number;
}

function CloudflareStatusPanel() {
  const [status, setStatus] = useState<CloudflareStatus | null>(null);

  useEffect(() => {
    apiRequest<CloudflareStatus>("/admin/cloudflare/status", { auth: true })
      .then(setStatus)
      .catch(() => undefined);
  }, []);

  const connected = Boolean(status?.connected);
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500 text-white"><ShieldCheck size={19} /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">Cloudflare</p>
            <h3 className="text-lg font-black text-(--text)">{connected ? "Connected" : "Needs config"}</h3>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {connected ? "Active" : "Pending"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <StatusPill label="DNS" value={status?.dns ? "Managed" : "Add zone"} />
        <StatusPill label="SSL" value={status?.ssl || "Unknown"} />
        <StatusPill label="DDoS" value={status?.ddosProtection || "Unknown"} />
        <StatusPill label="WAF" value={status?.waf || "Unknown"} />
        <StatusPill label="Bot" value={status?.botProtection || "Unknown"} />
        <StatusPill label="Threats Today" value={String(status?.threatsBlockedToday || 0)} />
      </div>
    </section>
  );
}

function CommandStatus({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "blue" }) {
  const toneClass = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  return (
    <article className="rounded-2xl border border-(--border) bg-(--bg-primary) p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-(--text-secondary)">{label}</p>
      <p className={`mt-2 rounded-xl px-3 py-2 text-lg font-black ${toneClass}`}>{value}</p>
    </article>
  );
}

function PremiumMetricCard({ label, value, detail, tone, icon, data }: { label: string; value: number; detail: string; tone: string; icon: ReactNode; data: number[] }) {
  const toneClass = tone === "red" ? "text-red-500 bg-red-50" : tone === "purple" ? "text-violet-600 bg-violet-50" : tone === "emerald" ? "text-emerald-600 bg-emerald-50" : "text-blue-600 bg-blue-50";
  const lineColor = tone === "red" ? "#ef4444" : tone === "purple" ? "#8b5cf6" : tone === "emerald" ? "#10b981" : "#2563eb";
  return (
    <article className="group overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClass}`}>{icon}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-(--text-secondary)">live data</span>
      </div>
      <p className="mt-5 text-sm font-bold text-(--text-secondary)">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="text-4xl font-black text-(--text)">{value}</p>
        <Sparkline data={data} color={lineColor} />
      </div>
      <p className="mt-3 text-xs font-semibold text-(--text-secondary)">{detail}</p>
    </article>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const hasData = data.some((value) => value > 0);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((value, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 90 + 5;
    const y = 35 - ((value - min) / Math.max(max - min, 1)) * 28;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 42" className="h-12 w-24 overflow-visible" aria-hidden="true">
      <polyline fill="none" stroke={hasData ? color : "#cbd5e1"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx="95" cy={points.split(" ").at(-1)?.split(",")[1] || 16} r="3.5" fill={hasData ? color : "#cbd5e1"} />
    </svg>
  );
}

function ChartPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <article className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-(--text)">{title}</h2>
          <p className="mt-1 text-sm text-(--text-secondary)">{description}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#101828] text-white">
          <Activity size={17} />
        </span>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function AreaChart({ data, color, emptyLabel = "No chart data recorded yet." }: { data: number[]; color: string; emptyLabel?: string }) {
  const hasData = data.some((value) => value > 0);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((value, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 300;
    const y = 130 - ((value - min) / Math.max(max - min, 1)) * 105;
    return `${x},${y}`;
  });
  const area = `0,150 ${points.join(" ")} 300,150`;
  return (
    <div className="rounded-3xl bg-(--bg-primary) p-4">
      {!hasData && <p className="mb-3 text-sm font-semibold text-(--text-secondary)">{emptyLabel}</p>}
      <svg viewBox="0 0 300 150" className="h-48 w-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 60, 90, 120].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="rgba(15,23,42,.08)" />)}
        <polygon points={area} fill="url(#areaFill)" />
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function DonutChart({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const hasData = items.some((item) => item.value > 0);
  let offset = 25;
  return (
    <div className="grid gap-5 sm:grid-cols-[12rem_1fr] sm:items-center">
      <svg viewBox="0 0 120 120" className="mx-auto h-44 w-44 -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r="42" fill="none" stroke="#e5e7eb" strokeWidth="18" />
        {items.map((item) => {
          const dash = (item.value / total) * 264;
          const circle = <circle key={item.label} cx="60" cy="60" r="42" fill="none" stroke={item.color} strokeWidth="18" strokeDasharray={`${dash} ${264 - dash}`} strokeDashoffset={-offset} strokeLinecap="round" />;
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="space-y-3">
        {!hasData && <p className="rounded-2xl bg-(--bg-primary) px-4 py-3 text-sm font-semibold text-(--text-secondary)">No threat distribution data recorded yet.</p>}
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-(--bg-primary) px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-black text-(--text)"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
            <span className="text-sm font-black text-(--text-secondary)">{Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, tone = "cyan" }: { label: string; value: number; tone?: "cyan" | "emerald" | "amber" | "red" | "violet" }) {
  const color = tone === "emerald" ? "bg-emerald-400" : tone === "amber" ? "bg-amber-400" : tone === "red" ? "bg-red-500" : tone === "violet" ? "bg-violet-400" : "bg-cyan-400";
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-black text-(--text)">{label}</span>
        <span className="font-bold text-(--text-secondary)">{value}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamp(value, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function getSecurityScore(summary: AdminSummary) {
  const failedLogins = summary.recentSecurityLogs.filter((log) => log.eventType.toLowerCase().includes("login") || log.reason.toLowerCase().includes("login")).length;
  return clamp(100 - summary.totals.openThreats * 8 - failedLogins * 3, 0, 100);
}

function buildHourlyTrend(items: Array<{ createdAt: string }>, bucketCount = 8) {
  const now = Date.now();
  const bucketMs = 60 * 60 * 1000;
  const buckets = Array.from({ length: bucketCount }, () => 0);
  items.forEach((item) => {
    const age = now - new Date(item.createdAt).getTime();
    const bucketFromEnd = Math.floor(age / bucketMs);
    const index = bucketCount - 1 - bucketFromEnd;
    if (index >= 0 && index < bucketCount) buckets[index] += 1;
  });
  return buckets;
}

function getThreatDistribution(summary: AdminSummary) {
  const severityCounts = summary.recentSocEvents.reduce<Record<string, number>>((counts, event) => {
    const key = event.severity.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  return [
    { label: "Critical", value: severityCounts.critical || 0, color: "#ef4444" },
    { label: "High", value: severityCounts.high || 0, color: "#f97316" },
    { label: "Medium", value: severityCounts.medium || 0, color: "#f59e0b" },
    { label: "Low", value: severityCounts.low || 0, color: "#22c55e" },
  ];
}

function getTopSourceIps(summary: AdminSummary) {
  const counts = [...summary.recentSocEvents, ...summary.recentSecurityLogs].reduce<Record<string, number>>((groups, event) => {
    const ip = event.ip || "";
    if (!ip) return groups;
    groups[ip] = (groups[ip] || 0) + 1;
    return groups;
  }, {});
  const maxCount = Math.max(...Object.values(counts), 1);
  return Object.entries(counts)
    .map(([ip, count]) => ({
      ip,
      count,
      score: Math.max(8, Math.round((count / maxCount) * 100)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getThreatSources(summary: AdminSummary) {
  const colors = ["#ef4444", "#f59e0b", "#2563eb", "#8b5cf6", "#10b981"];
  return getTopSourceIps(summary).map((row, index) => {
    const fallback = getFallbackMapPoint(row.ip, index);
    return {
      ...row,
      x: fallback.x,
      y: fallback.y,
      color: colors[index % colors.length],
    };
  });
}

function getEventTypeBreakdown(events: AdminSummary["recentEvents"]) {
  const counts = events.reduce<Record<string, number>>((groups, event) => {
    const label = event.type || "unknown";
    groups[label] = (groups[label] || 0) + 1;
    return groups;
  }, {});
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function formatUptime(seconds: number) {
  if (!seconds) return "starting";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function VisitorsView({ summary, refreshKey }: { summary: AdminSummary; refreshKey: number }) {
  const location = useLocation();
  const { showToast, updateToast } = useToast();
  const [visitors, setVisitors] = useState<VisitorProfile[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [query, setQuery] = useState("");
  const [flagFilter, setFlagFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [visitorBin, setVisitorBin] = useState<"active" | "trash">("active");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationPickerStep, setLocationPickerStep] = useState<"visitors" | "sources">("visitors");
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [activeTarget, setActiveTarget] = useState<MapTarget | null>(null);
  const [adminLocation, setAdminLocation] = useState<AdminGeoLocation | null>(null);
  const [mapFocus, setMapFocus] = useState<"target" | "admin">("target");
  const [draft, setDraft] = useState({ customName: "", hostname: "", flag: "monitor", notes: "" });

  const loadVisitors = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ visitors: VisitorProfile[] }>(visitorBin === "trash" ? "/admin/visitors/trash" : "/admin/visitors", { auth: true });
      setVisitors(data.visitors);
      setSelectedKey((current) => current || data.visitors[0]?.visitorKey || "");
    } finally {
      setIsLoading(false);
    }
  }, [visitorBin]);

  useEffect(() => {
    loadVisitors().catch(() => setIsLoading(false));
  }, [loadVisitors, refreshKey]);

  useEffect(() => {
    const visitorParam = new URLSearchParams(location.search).get("visitor");
    if (!visitorParam || visitors.length === 0) return;
    const matched = visitors.find((visitor) => visitor.visitorKey === visitorParam || visitor.visitorId === visitorParam || visitor.ip === visitorParam);
    if (matched) {
      setSelectedKey(matched.visitorKey);
      setDetailsOpen(true);
    }
  }, [location.search, visitors]);

  const filteredVisitors = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return visitors.filter((visitor) => {
      const matchesFlag = flagFilter === "all" || visitor.flag === flagFilter;
      const haystack = [
        visitor.customName,
        visitor.hostname,
        visitor.ip,
        visitor.country,
        visitor.state,
        visitor.city,
        visitor.isp,
        visitor.asn,
        visitor.browser,
        visitor.os,
        visitor.device,
      ].join(" ").toLowerCase();
      return matchesFlag && (!normalized || haystack.includes(normalized));
    });
  }, [flagFilter, query, visitors]);

  const selectedVisitor = visitors.find((visitor) => visitor.visitorKey === selectedKey) || filteredVisitors[0] || visitors[0];

  useEffect(() => {
    if (!selectedVisitor) return;
    setDraft({
      customName: selectedVisitor.customName || "",
      hostname: selectedVisitor.hostname || "",
      flag: selectedVisitor.flag || "monitor",
      notes: selectedVisitor.notes || "",
    });
    setActiveTarget(getBestVisitorTarget(selectedVisitor));
  }, [selectedVisitor]);

  useEffect(() => {
    setSelectedKey("");
  }, [visitorBin]);

  const saveVisitorNotes = async () => {
    if (!selectedVisitor) return;
    const toastId = showToast("Saving Visitor", "Updating visitor notes and flag...", "loading");
    try {
      await apiRequest(`/admin/visitors/${encodeURIComponent(selectedVisitor.visitorKey)}/notes`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(draft),
      });
      await loadVisitors();
      updateToast(toastId, "Saved Successfully", "Visitor profile was updated.", "success");
    } catch (err) {
      updateToast(toastId, "Save Failed", err instanceof Error ? err.message : "Please try again.", "error");
    }
  };

  const pinVisitor = async (visitor: VisitorProfile) => {
    const toastId = showToast("Pinning Visitor", "Marking this visitor as important...", "loading");
    try {
      await apiRequest(`/admin/visitors/${encodeURIComponent(visitor.visitorKey)}/notes`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          customName: visitor.customName || "",
          hostname: visitor.hostname || "",
          flag: "important",
          notes: visitor.notes || "",
        }),
      });
      await loadVisitors();
      updateToast(toastId, "Saved Successfully", "Visitor pinned as important.", "success");
    } catch (err) {
      updateToast(toastId, "Save Failed", err instanceof Error ? err.message : "Could not pin visitor.", "error");
    }
  };

  const exportVisitors = (format: "json" | "csv") => {
    try {
      const filename = `cipherwolf-visitors.${format}`;
      const content = format === "json" ? JSON.stringify(filteredVisitors, null, 2) : visitorsToCsv(filteredVisitors);
      downloadTextFile(filename, content, format === "json" ? "application/json" : "text/csv");
      showToast("Download Started", `${filename} is being saved.`, "success");
    } catch {
      showToast("Download Failed", "Could not export visitors right now.", "error");
    }
  };

  const deleteVisitor = async (visitor: VisitorProfile, mode: "trash" | "permanent") => {
    const label = visitor.customName || visitor.hostname || visitor.ip || visitor.visitorKey;
    const message = mode === "permanent"
      ? `Permanently delete all database events for ${label}?`
      : `Move ${label} to visitor trash?`;
    if (!window.confirm(message)) return;

    const toastId = showToast(mode === "permanent" ? "Deleting Permanently" : "Moving To Trash", "Updating visitor records...", "loading");
    try {
      await apiRequest(`/admin/visitors/${encodeURIComponent(visitor.visitorKey)}?mode=${mode}`, {
        method: "DELETE",
        auth: true,
      });
      await loadVisitors();
      updateToast(toastId, mode === "permanent" ? "Permanently Deleted" : "Moved To Trash", mode === "permanent" ? "Visitor records were removed from the database." : "Visitor records are now in trash.", "success");
    } catch (err) {
      updateToast(toastId, "Delete Failed", err instanceof Error ? err.message : "Please try again.", "error");
    }
  };

  const deleteVisitorEvent = async (eventId: string) => {
    if (!window.confirm("Move this single visit/action to trash?")) return;
    const toastId = showToast("Deleting Visit", "Moving this visit/action to trash...", "loading");
    try {
      await apiRequest(`/admin/visitor-events/${encodeURIComponent(eventId)}?mode=trash`, {
        method: "DELETE",
        auth: true,
      });
      await loadVisitors();
      updateToast(toastId, "Visit Deleted", "This visit/action was moved to trash.", "success");
    } catch (err) {
      updateToast(toastId, "Delete Failed", err instanceof Error ? err.message : "Please try again.", "error");
    }
  };

  const manualTrackedVisitor = selectedVisitor
    ? {
        ...selectedVisitor,
        latitude: Number.isFinite(Number(manualLat)) && manualLat !== "" ? Number(manualLat) : selectedVisitor.latitude,
        longitude: Number.isFinite(Number(manualLon)) && manualLon !== "" ? Number(manualLon) : selectedVisitor.longitude,
      }
    : null;

  const selectVisitor = (visitor: VisitorProfile, openDetails = false) => {
    setSelectedKey(visitor.visitorKey);
    setActiveTarget(getBestVisitorTarget(visitor));
    setMapFocus("target");
    if (openDetails) setDetailsOpen(true);
  };

  const locationOptions = selectedVisitor ? getVisitorLocationOptions(selectedVisitor, manualLat, manualLon) : [];
  const activeDistance =
    adminLocation && activeTarget && activeTarget.latitude !== null && activeTarget.longitude !== null
      ? calculateDistanceKm(adminLocation.latitude, adminLocation.longitude, activeTarget.latitude, activeTarget.longitude)
      : null;

  const chooseLocationTarget = (target: MapTarget) => {
    setActiveTarget(target);
    setMapFocus("target");
    setManualLat(target.latitude !== null ? String(target.latitude) : "");
    setManualLon(target.longitude !== null ? String(target.longitude) : "");
    setLocationPickerOpen(false);
    showToast("Location Selected", `Showing ${target.label} on the map.`, "success");
  };

  const openLocationPicker = (visitor: VisitorProfile) => {
    selectVisitor(visitor);
    setLocationPickerStep("sources");
    setLocationPickerOpen(true);
  };

  const requestAdminLocation = () => {
    if (!("geolocation" in navigator)) {
      showToast("Location Unavailable", "This browser does not support location access.", "error");
      return;
    }

    const toastId = showToast("Finding You", "Getting your current GPS location...", "loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAdminLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
        setManualLat(String(position.coords.latitude));
        setManualLon(String(position.coords.longitude));
        updateToast(toastId, "Location Ready", "Distance can now be calculated from your blue-dot location.", "success");
      },
      (err) => {
        updateToast(toastId, "Location Blocked", err.message || "Allow location permission and try again.", "error");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
    );
  };

  const trackSelectedDestination = () => {
    const manualTarget = getManualLocationTarget(manualLat, manualLon);
    if (manualTarget) {
      setActiveTarget(manualTarget);
      setMapFocus("target");
      showToast("Manual Location", "Showing the manual latitude and longitude on the map.", "success");
      return;
    }

    if (activeTarget) {
      setMapFocus("target");
      showToast("Visitor Location", `Showing ${activeTarget.label} on the map.`, "success");
      return;
    }
  };

  const calculateSelectedDistance = () => {
    requestAdminLocation();
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <VisitorMetric label="Tracked Visitors" value={visitors.length} detail={`${summary.totals.analyticsEvents24h} events / 24h`} icon={<Globe2 size={18} />} />
        <VisitorMetric label="Resume Downloads" value={visitors.filter((visitor) => visitor.resumeDownloaded).length} detail="Tracked by visitor ID" icon={<FileDown size={18} />} />
        <VisitorMetric label="Project Clicks" value={visitors.reduce((total, visitor) => total + visitor.projectClicks.length, 0)} detail="Case-study interest" icon={<MousePointerClick size={18} />} />
        <VisitorMetric label="High Risk" value={visitors.filter((visitor) => visitor.threatScore >= 70).length} detail="Threat score 70+" icon={<ShieldAlert size={18} />} />
      </div>

      <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-(--text)">Visitor Map</h2>
            <p className="mt-1 text-sm text-(--text-secondary)">Default view shows each IP group as a colored dot. Hover for metadata or click a dot to focus that visitor.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input value={manualLat} onChange={(event) => setManualLat(event.target.value)} placeholder="Latitude" className="h-11 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 text-sm font-semibold outline-none" />
            <input value={manualLon} onChange={(event) => setManualLon(event.target.value)} placeholder="Longitude" className="h-11 rounded-2xl border border-(--border) bg-(--bg-primary) px-4 text-sm font-semibold outline-none" />
            <button onClick={trackSelectedDestination} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#101828] px-4 text-sm font-bold text-white">
              <Navigation size={16} />
              Track
            </button>
          </div>
        </div>
        {selectedVisitor && activeTarget && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => { setLocationPickerStep("visitors"); setLocationPickerOpen(true); }} className="rounded-2xl border border-(--border) bg-white px-4 py-2 text-sm font-black text-(--text)">Choose visitor GPS/IP</button>
            <button onClick={() => { requestAdminLocation(); setMapFocus("admin"); }} className="rounded-2xl border border-(--border) bg-white px-4 py-2 text-sm font-black text-(--text)">My location</button>
            <button onClick={calculateSelectedDistance} className="rounded-2xl bg-[#101828] px-4 py-2 text-sm font-black text-white">Distance</button>
          </div>
        )}
        {selectedVisitor && activeTarget ? (
          <VisitorMap visitor={manualTrackedVisitor || selectedVisitor} visitors={filteredVisitors.length ? filteredVisitors : visitors} target={activeTarget} adminLocation={adminLocation} distance={activeDistance} focus={mapFocus} setFocus={setMapFocus} onUseMyLocation={requestAdminLocation} onVisitorFocus={selectVisitor} compact />
        ) : (
          <div className="mt-5 rounded-3xl bg-(--bg-primary) p-8 text-center text-(--text-secondary)">No visitor selected yet.</div>
        )}
      </div>

      <div className="rounded-3xl border border-white/80 bg-white shadow-sm">
        <div className="border-b border-(--border) p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-(--text)">Visitor Intelligence Sheet</h2>
              <p className="mt-1 text-sm text-(--text-secondary)">{filteredVisitors.length} rows shown from {visitors.length} {visitorBin === "trash" ? "trashed" : "tracked"} IP groups.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="inline-flex rounded-2xl border border-(--border) bg-(--bg-primary) p-1">
                {(["active", "trash"] as const).map((bin) => (
                  <button
                    key={bin}
                    onClick={() => setVisitorBin(bin)}
                    className={`h-9 rounded-xl px-4 text-xs font-black capitalize ${visitorBin === bin ? "bg-[#101828] text-white" : "text-(--text-secondary)"}`}
                  >
                    {bin === "active" ? "Active" : "Trash"}
                  </button>
                ))}
              </div>
              <label className="relative min-w-0 sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-secondary)" size={17} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search visitor, country, ISP, browser"
                  className="h-11 w-full rounded-2xl border border-(--border) bg-(--bg-primary) pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#101828]"
                />
              </label>
              <div className="relative">
                <button
                  onClick={() => setFilterOpen((open) => !open)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-(--border) bg-white px-4 text-sm font-bold text-(--text)"
                >
                  <SlidersHorizontal size={16} />
                  Filter
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-13 z-20 w-56 rounded-3xl border border-(--border) bg-white p-3 shadow-2xl shadow-slate-900/15">
                    {["all", "important", "watchlist", "safe", "monitor", "suspicious", "blocked"].map((flag) => (
                      <button
                        key={flag}
                        onClick={() => {
                          setFlagFilter(flag);
                          setFilterOpen(false);
                        }}
                        className={`block w-full rounded-2xl px-4 py-3 text-left text-sm font-bold capitalize ${flagFilter === flag ? "bg-[#101828] text-white" : "text-(--text-secondary) hover:bg-(--bg-primary) hover:text-(--text)"}`}
                      >
                        {flag === "all" ? "All Flags" : flag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-(--bg-primary) text-xs font-black uppercase tracking-wide text-(--text-secondary)">
              <tr>
                <th className="px-5 py-4">Visitor</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Device</th>
                <th className="px-5 py-4">Network</th>
                <th className="px-5 py-4">Activity</th>
                <th className="px-5 py-4">Flag</th>
                <th className="px-5 py-4">Risk</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-(--text-secondary)">Loading visitor intelligence...</td>
                </tr>
              )}
              {!isLoading && filteredVisitors.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-(--text-secondary)">No visitor profiles match this filter.</td>
                </tr>
              )}
              {filteredVisitors.map((visitor) => (
                <tr key={visitor.visitorKey} className={`border-t border-(--border) transition hover:bg-(--bg-primary) ${selectedVisitor?.visitorKey === visitor.visitorKey ? "bg-slate-50" : "bg-white"}`}>
                  <td className="px-5 py-4">
                    <button onClick={() => selectVisitor(visitor)} className="flex min-w-0 items-center gap-3 text-left">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-slate-100" style={{ backgroundColor: visitor.color }} />
                      <span className="min-w-0">
                        <span className="block truncate font-black text-(--text)">{visitor.customName || visitor.hostname || visitor.ip || "Unknown visitor"}</span>
                        <span className="mt-1 block truncate text-xs text-(--text-secondary)">{visitor.ip || visitor.visitorId || visitor.visitorKey}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-(--text)">{visitor.city}, {visitor.country}</p>
                    <p className="mt-1 text-xs text-(--text-secondary)">GPS {visitor.latitude && visitor.longitude ? `${visitor.latitude.toFixed(3)}, ${visitor.longitude.toFixed(3)}` : "pending"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <DeviceOsBadge device={visitor.device} os={visitor.os} browser={visitor.browser} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-42 truncate font-bold text-(--text)">{visitor.isp}</p>
                    <p className="mt-1 text-xs text-(--text-secondary)">ASN {visitor.asn}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-(--text)">{visitor.eventCount} events</p>
                    <p className="mt-1 text-xs text-(--text-secondary)">{visitor.sessions.length} sessions / {visitor.resumeDownloaded ? "Resume downloaded" : `${visitor.projectClicks.length} project clicks`}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-(--bg-primary) px-3 py-1 text-xs font-black capitalize text-(--text-secondary)">{visitor.flag}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${visitor.threatScore >= 70 ? "bg-red-100 text-red-700" : visitor.threatScore >= 35 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{visitor.threatScore}/100</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openLocationPicker(visitor)} className="inline-flex h-9 items-center gap-1 rounded-xl border border-(--border) bg-white px-3 text-xs font-black text-(--text)" title="Find visitor location">
                        <Navigation size={15} />
                        Find
                      </button>
                      <button onClick={() => selectVisitor(visitor, true)} className="grid h-9 w-9 place-items-center rounded-xl border border-(--border) bg-white text-(--text)" title="Edit visitor">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => selectVisitor(visitor, true)} className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#101828] px-3 text-xs font-black text-white">
                        <Eye size={14} />
                        View More
                      </button>
                      <button onClick={() => void pinVisitor(visitor)} className="grid h-9 w-9 place-items-center rounded-xl border border-(--border) bg-white text-(--text)" title="Pin visitor as important">
                        <Pin size={15} />
                      </button>
                      <button
                        onClick={() => void deleteVisitor(visitor, visitorBin === "trash" ? "permanent" : "trash")}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-700"
                        title={visitorBin === "trash" ? "Permanently delete visitor" : "Move visitor to trash"}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-(--border) p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-(--text-secondary)">Export the current filtered sheet for reports or offline analysis.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportVisitors("json")} className="inline-flex items-center gap-2 rounded-2xl bg-[#101828] px-4 py-2 text-sm font-bold text-white">
              <Download size={16} />
              Download JSON
            </button>
            <button onClick={() => exportVisitors("csv")} className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-white px-4 py-2 text-sm font-bold text-(--text)">
              <Download size={16} />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {detailsOpen && selectedVisitor && (
        <VisitorDetail
          visitor={manualTrackedVisitor || selectedVisitor}
          draft={draft}
          setDraft={setDraft}
          onSave={saveVisitorNotes}
          onDeleteEvent={deleteVisitorEvent}
          onCancel={() => {
            setDraft({
              customName: selectedVisitor.customName || "",
              hostname: selectedVisitor.hostname || "",
              flag: selectedVisitor.flag || "monitor",
              notes: selectedVisitor.notes || "",
            });
          }}
          onClose={() => setDetailsOpen(false)}
        />
      )}
      {locationPickerOpen && selectedVisitor && (
        <LocationChoiceModal
          step={locationPickerStep}
          visitors={filteredVisitors.length ? filteredVisitors : visitors}
          visitor={selectedVisitor}
          options={locationOptions}
          onVisitorChoose={(visitor) => {
            selectVisitor(visitor);
            setLocationPickerStep("sources");
          }}
          onChoose={chooseLocationTarget}
          onClose={() => setLocationPickerOpen(false)}
        />
      )}
    </section>
  );
}

function VisitorMetric({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: ReactNode }) {
  return (
    <article className="rounded-3xl border border-white/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#101828] text-white">{icon}</span>
        <span className="text-3xl font-black text-(--text)">{value}</span>
      </div>
      <p className="mt-4 text-sm font-bold text-(--text)">{label}</p>
      <p className="mt-1 text-xs text-(--text-secondary)">{detail}</p>
    </article>
  );
}

function ContactsView({ refreshKey }: { refreshKey: number }) {
  const navigate = useNavigate();
  const { showToast, updateToast } = useToast();
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string>("");

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ contacts: ContactMessage[] }>("/admin/contacts", { auth: true });
      setContacts(data.contacts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts().catch(() => setIsLoading(false));
  }, [loadContacts, refreshKey]);

  const filteredContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter((contact) => [contact.name, contact.email, contact.subject, contact.message, contact.ip, contact.visitorId].join(" ").toLowerCase().includes(normalized));
  }, [contacts, query]);

  const updateContact = async (contact: ContactMessage, body: { status?: "new" | "read" | "archived"; pinned?: boolean }) => {
    const toastId = showToast("Updating Contact", "Saving message status...", "loading");
    try {
      await apiRequest(`/admin/contacts/${contact.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(body),
      });
      await loadContacts();
      updateToast(toastId, "Saved Successfully", "Contact message updated.", "success");
    } catch (err) {
      updateToast(toastId, "Update Failed", err instanceof Error ? err.message : "Please try again.", "error");
    }
  };

  const deleteContact = async (contact: ContactMessage) => {
    if (!window.confirm(`Delete message from ${contact.name}?`)) return;
    const toastId = showToast("Deleting Contact", "Removing the message...", "loading");
    try {
      await apiRequest(`/admin/contacts/${contact.id}`, { method: "DELETE", auth: true });
      await loadContacts();
      updateToast(toastId, "Deleted Successfully", "Contact message removed.", "success");
    } catch (err) {
      updateToast(toastId, "Delete Failed", err instanceof Error ? err.message : "Please try again.", "error");
    }
  };

  const openVisitor = (contact: ContactMessage) => {
    const key = contact.visitorId || contact.ip;
    if (!key) {
      showToast("Visitor Missing", "This contact has no visitor identity attached.", "error");
      return;
    }
    navigate(`/admin/visitors?visitor=${encodeURIComponent(key)}`);
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <VisitorMetric label="All Messages" value={contacts.length} detail="Stored in backend" icon={<Bell size={18} />} />
        <VisitorMetric label="Unread" value={contacts.filter((contact) => contact.status === "new").length} detail="Needs reply" icon={<Eye size={18} />} />
        <VisitorMetric label="Pinned" value={contacts.filter((contact) => contact.pinned).length} detail="Important leads" icon={<Pin size={18} />} />
      </div>

      <div className="rounded-3xl border border-white/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-(--border) p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-(--text)">Contact Inbox</h2>
            <p className="mt-1 text-sm text-(--text-secondary)">Messages are linked to visitor identity, IP, device, and submit time.</p>
          </div>
          <label className="relative min-w-0 sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-secondary)" size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, message, visitor" className="h-11 w-full rounded-2xl border border-(--border) bg-(--bg-primary) pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#101828]" />
          </label>
        </div>

        <div className="grid gap-4 p-5">
          {isLoading && <p className="rounded-2xl bg-(--bg-primary) p-5 text-center text-(--text-secondary)">Loading contact messages...</p>}
          {!isLoading && filteredContacts.length === 0 && <p className="rounded-2xl bg-(--bg-primary) p-5 text-center text-(--text-secondary)">No contact messages match this search.</p>}
          {filteredContacts.map((contact) => (
            <article key={contact.id} className={`rounded-3xl border p-5 ${contact.status === "new" ? "border-cyan-200 bg-cyan-50/40" : "border-(--border) bg-(--bg-primary)"}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <button onClick={() => setExpandedId((current) => current === contact.id ? "" : contact.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-(--text)">{contact.name}</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-(--text-secondary)">{contact.status}</span>
                    {contact.pinned && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Pinned</span>}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--text-secondary)">{contact.subject || "Portfolio contact"} · {formatDate(contact.createdAt)}</p>
                  {expandedId !== contact.id && <p className="mt-2 line-clamp-1 text-sm text-(--text-secondary)">Click to expand full message</p>}
                </button>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button onClick={() => void updateContact(contact, { status: contact.status === "new" ? "read" : "new" })} className="rounded-2xl border border-(--border) bg-white px-4 py-2 text-xs font-black text-(--text)">{contact.status === "new" ? "Mark read" : "Unread"}</button>
                  <button onClick={() => void updateContact(contact, { pinned: !contact.pinned })} className="rounded-2xl border border-(--border) bg-white px-4 py-2 text-xs font-black text-(--text)">{contact.pinned ? "Unpin" : "Pin"}</button>
                  <button onClick={() => openVisitor(contact)} className="rounded-2xl bg-[#101828] px-4 py-2 text-xs font-black text-white">Visitor</button>
                  <button onClick={() => void deleteContact(contact)} className="rounded-2xl bg-red-100 px-4 py-2 text-xs font-black text-red-700">Delete</button>
                </div>
              </div>
              {expandedId === contact.id && (
                <div className="mt-4 rounded-3xl bg-white p-4">
                  <p className="text-sm font-semibold text-(--text-secondary)">{contact.email} · {contact.source}</p>
                  <p className="mt-3 text-sm font-black text-(--text)">{contact.subject || "Portfolio contact"}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-(--text)">{contact.message}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-(--text-secondary)">
                    <span className="rounded-full bg-(--bg-primary) px-3 py-1">IP {contact.ip || "Unknown"}</span>
                    <span className="rounded-full bg-(--bg-primary) px-3 py-1">Visitor {contact.visitorId || "Unknown"}</span>
                    <span className="rounded-full bg-(--bg-primary) px-3 py-1">{getContactLocation(contact.metadata)}</span>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function VisitorDetail({
  visitor,
  draft,
  setDraft,
  onSave,
  onDeleteEvent,
  onCancel,
  onClose,
}: {
  visitor: VisitorProfile;
  draft: { customName: string; hostname: string; flag: string; notes: string };
  setDraft: (draft: { customName: string; hostname: string; flag: string; notes: string }) => void;
  onSave: () => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onCancel: () => void;
  onClose: () => void;
}) {
  const threatTone = visitor.threatScore >= 70 ? "text-red-600 bg-red-50" : visitor.threatScore >= 35 ? "text-amber-700 bg-amber-50" : "text-emerald-700 bg-emerald-50";
  const [isEditingNotes, setIsEditingNotes] = useState(!visitor.hostname && !visitor.notes);
  const [expandedEventId, setExpandedEventId] = useState("");

  const saveNotes = async () => {
    await onSave();
    setIsEditingNotes(false);
  };

  const cancelNotes = () => {
    onCancel();
    setIsEditingNotes(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-3 pb-3 backdrop-blur-xl sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-4xl border border-white/70 bg-white/95 p-5 shadow-[0_40px_120px_rgba(15,23,42,0.25)] backdrop-blur-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-5 w-5 rounded-full ring-4 ring-slate-100" style={{ backgroundColor: visitor.color }} />
            <div>
              <h2 className="text-2xl font-black text-(--text)">{visitor.customName || visitor.hostname || visitor.ip || "Visitor Intelligence Profile"}</h2>
              <p className="mt-1 text-sm text-(--text-secondary)">{visitor.visitorId || visitor.visitorKey}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`w-fit rounded-2xl px-4 py-2 text-sm font-black ${threatTone}`}>
              Threat Score {visitor.threatScore}/100
            </span>
            <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl border border-(--border) bg-white text-(--text)" aria-label="Close visitor details">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IntelTile icon={<MapPin size={17} />} label="Location" value={`${visitor.city}, ${visitor.country}`} detail={visitor.accuracy ? `GPS accuracy ${Math.round(visitor.accuracy)}m` : "IP/GPS data pending"} />
          <IntelTile icon={<Monitor size={17} />} label="Device" value={`${visitor.device} / ${visitor.os}`} detail={`${visitor.browser} / ${visitor.screenResolution}`} />
          <IntelTile icon={<Globe2 size={17} />} label="Network" value={visitor.isp} detail={`ASN ${visitor.asn} / ${visitor.ip || "No IP"}`} />
          <IntelTile icon={<Clock3 size={17} />} label="Session" value={`${visitor.visitCount} visit${visitor.visitCount === 1 ? "" : "s"}`} detail={`${formatDuration(visitor.visitDurationMs)} latest duration`} />
        </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Visitor Notes" empty="">
          {isEditingNotes ? (
            <>
              <ProfileField label="Custom hostname" placeholder="Friend laptop / College lab" value={draft.hostname} onChange={(value) => setDraft({ ...draft, hostname: value })} />
              <label className="block">
                <span className="text-sm font-semibold text-(--text-secondary)">Flag</span>
                <select value={draft.flag} onChange={(event) => setDraft({ ...draft, flag: event.target.value })} className="mt-2 w-full rounded-2xl border border-(--border) bg-white px-4 py-3 text-(--text) outline-none">
                  <option value="important">Important</option>
                  <option value="watchlist">Watchlist</option>
                  <option value="safe">Safe</option>
                  <option value="monitor">Monitor</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-(--text-secondary)">Notes</span>
                <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Looks like recruiter. Visited 4 times. Downloaded CV twice." className="mt-2 min-h-28 w-full rounded-2xl border border-(--border) bg-white px-4 py-3 text-(--text) outline-none" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void saveNotes()} className="inline-flex items-center gap-2 rounded-2xl bg-[#101828] px-5 py-3 text-sm font-bold text-white">
                  <Save size={16} />
                  Save visitor
                </button>
                <button onClick={cancelNotes} className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-white px-5 py-3 text-sm font-bold text-(--text)">
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-(--text-secondary)">Hostname</p>
                  <p className="mt-1 font-black text-(--text)">{visitor.hostname || "Not named yet"}</p>
                  <p className="mt-3 text-xs font-black uppercase tracking-wide text-(--text-secondary)">Flag</p>
                  <p className="mt-1 font-black capitalize text-(--text)">{visitor.flag}</p>
                  <p className="mt-3 text-xs font-black uppercase tracking-wide text-(--text-secondary)">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-(--text)">{visitor.notes || "No notes saved yet."}</p>
                </div>
                <button onClick={() => setIsEditingNotes(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-(--border) bg-white text-(--text)" aria-label="Edit visitor notes">
                  <Edit3 size={16} />
                </button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Fixed Intelligence" empty="">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniFact label="IPv4" value={getIpVersion(visitor.ip) === "IPv4" ? visitor.ip || "Unknown" : "Not detected"} />
            <MiniFact label="IPv6" value={getIpVersion(visitor.ip) === "IPv6" ? visitor.ip || "Unknown" : "Not detected"} />
            <MiniFact label="GPS Latitude" value={formatCoordinate(visitor.latitude)} />
            <MiniFact label="GPS Longitude" value={formatCoordinate(visitor.longitude)} />
            <MiniFact label="IP Latitude" value={formatCoordinate(visitor.ipLatitude)} />
            <MiniFact label="IP Longitude" value={formatCoordinate(visitor.ipLongitude)} />
            <MiniFact label="IP Geo Status" value={visitor.ipGeoSource || "Public IP lookup pending"} />
            <MiniFact label="Country / City" value={`${visitor.country} / ${visitor.city}`} />
            <MiniFact label="ISP / ASN" value={`${visitor.isp} / ${visitor.asn}`} />
            <MiniFact label="Browser" value={visitor.browser} />
            <MiniFact label="OS / Device" value={`${visitor.os} / ${visitor.device}`} />
            <MiniFact label="Screen" value={visitor.screenResolution} />
            <MiniFact label="Time zone" value={visitor.timezone} />
            <MiniFact label="Referrer" value={visitor.referrer} />
            <MiniFact label="Visit duration" value={formatDuration(visitor.visitDurationMs)} />
            <MiniFact label="Resume downloaded" value={visitor.resumeDownloaded ? "Yes" : "No"} />
            <MiniFact label="Project clicks" value={String(visitor.projectClicks.length)} />
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Pages & Actions" empty="">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniFact label="First visit" value={formatDate(visitor.firstVisit)} />
            <MiniFact label="Last visit" value={formatDate(visitor.lastVisit)} />
          </div>
          <div>
            <p className="text-sm font-bold text-(--text)">Sessions in this IP group</p>
            <div className="mt-3 space-y-2">
              {visitor.sessions.map((session) => (
                <article key={session.sessionId} className="rounded-2xl bg-(--bg-primary) px-4 py-3">
                  <p className="text-sm font-black text-(--text)">{session.device} / {session.browser} / {session.os}</p>
                  <p className="mt-1 text-xs text-(--text-secondary)">{session.eventCount} events · {formatDate(session.lastSeen)}</p>
                </article>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-(--text)">Pages visited</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {visitor.pages.map((page) => (
                <span key={page} className="rounded-full bg-(--bg-primary) px-3 py-1 text-xs font-bold text-(--text-secondary)">{page}</span>
              ))}
            </div>
          </div>
          {visitor.projectClicks.length > 0 && (
            <div>
              <p className="text-sm font-bold text-(--text)">Projects viewed</p>
              <div className="mt-3 space-y-2">
                {visitor.projectClicks.slice(0, 5).map((project, index) => (
                  <p key={`${project.title}-${index}`} className="rounded-2xl bg-(--bg-primary) px-4 py-3 text-sm font-semibold text-(--text)">{project.title}</p>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Full Activity Timeline" empty={visitor.timeline.length === 0 ? "No activity yet." : ""}>
          {visitor.timeline.map((event) => {
            const isExpanded = expandedEventId === event.id;
            return (
              <article key={event.id} className="rounded-2xl bg-(--bg-primary) p-4">
                <div className="flex gap-3">
                  <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-(--text)">
                    <Route size={15} />
                  </span>
                  <button onClick={() => setExpandedEventId(isExpanded ? "" : event.id)} className="min-w-0 flex-1 text-left">
                    <p className="font-bold text-(--text)">{event.projectTitle || event.type}</p>
                    <p className="mt-1 text-sm text-(--text-secondary)">{event.path} / {formatDate(event.createdAt)}</p>
                    <p className="mt-2 text-xs font-black text-[#101828]">{isExpanded ? "Hide saved visit data" : "Show saved visit data"}</p>
                  </button>
                  <button onClick={() => void onDeleteEvent(event.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700" title="Delete this visit">
                    <Trash2 size={15} />
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniFact label="Device" value={`${event.device} / ${event.browser} / ${event.os}`} />
                    <MiniFact label="Screen" value={event.screenResolution} />
                    <MiniFact label="Time zone" value={event.timezone} />
                    <MiniFact label="Referrer" value={event.referrer} />
                    <MiniFact label="GPS Latitude" value={formatCoordinate(event.latitude)} />
                    <MiniFact label="GPS Longitude" value={formatCoordinate(event.longitude)} />
                    <MiniFact label="GPS Accuracy" value={event.accuracy === null ? "Not detected" : `${Math.round(event.accuracy)}m`} />
                    <MiniFact label="Location Error" value={event.locationError || "None"} />
                    <article className="rounded-2xl bg-white p-4 sm:col-span-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-(--text-secondary)">User agent</p>
                      <p className="mt-2 break-words text-sm font-semibold text-(--text)">{event.userAgent || "Not captured"}</p>
                    </article>
                  </div>
                )}
              </article>
            );
          })}
        </Panel>
      </div>
      </div>
    </div>
  );
}

function LocationChoiceModal({
  step,
  visitors,
  visitor,
  options,
  onVisitorChoose,
  onChoose,
  onClose,
}: {
  step: "visitors" | "sources";
  visitors: VisitorProfile[];
  visitor: VisitorProfile;
  options: MapTarget[];
  onVisitorChoose: (visitor: VisitorProfile) => void;
  onChoose: (target: MapTarget) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-3 pb-3 backdrop-blur-xl sm:items-center sm:p-6" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-4xl border border-white/70 bg-white/95 p-5 shadow-[0_40px_120px_rgba(15,23,42,0.25)] backdrop-blur-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">{step === "visitors" ? "Choose Visitor" : "Choose Location Source"}</p>
            <h2 className="mt-2 text-2xl font-black text-(--text)">{step === "visitors" ? "Visitor location monitor" : visitor.customName || visitor.hostname || visitor.ip || "Visitor location"}</h2>
            <p className="mt-1 text-sm text-(--text-secondary)">{step === "visitors" ? "Pick a visitor first, then choose GPS, IP, or manual coordinates." : "Pick whether you want precise GPS/manual coordinates or IP city location."}</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-(--border) bg-white text-(--text)" aria-label="Close location picker">
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {step === "visitors" && visitors.map((visitorOption) => (
            <button key={visitorOption.visitorKey} onClick={() => onVisitorChoose(visitorOption)} className="group flex items-center justify-between gap-4 rounded-3xl border border-(--border) bg-(--bg-primary) p-4 text-left transition hover:border-[#101828] hover:bg-white hover:shadow-lg hover:shadow-slate-900/10">
              <span className="flex min-w-0 items-center gap-3">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white" style={{ backgroundColor: visitorOption.color }} />
                <span className="min-w-0">
                  <span className="block font-black text-(--text)">{visitorOption.customName || visitorOption.hostname || visitorOption.ip || "Unknown visitor"}</span>
                  <span className="mt-1 block truncate text-sm text-(--text-secondary)">{visitorOption.city}, {visitorOption.country} · {visitorOption.browser} / {visitorOption.os}</span>
                </span>
              </span>
              <span className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-(--text) shadow-sm group-hover:bg-[#101828] group-hover:text-white">Select</span>
            </button>
          ))}
          {step === "sources" && options.map((option) => (
            <button key={option.source} onClick={() => onChoose(option)} className="group flex items-center justify-between gap-4 rounded-3xl border border-(--border) bg-(--bg-primary) p-4 text-left transition hover:border-[#101828] hover:bg-white hover:shadow-lg hover:shadow-slate-900/10">
              <span className="flex min-w-0 items-center gap-3">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${option.source === "gps" ? "bg-emerald-100 text-emerald-700" : option.source === "manual" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                  {option.source === "ip" ? <Globe2 size={19} /> : <MapPin size={19} />}
                </span>
                <span className="min-w-0">
                  <span className="block font-black text-(--text)">{option.label}</span>
                  <span className="mt-1 block truncate text-sm text-(--text-secondary)">{option.latitude !== null && option.longitude !== null ? `${option.latitude.toFixed(5)}, ${option.longitude.toFixed(5)}` : option.query}</span>
                </span>
              </span>
              <span className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-(--text) shadow-sm group-hover:bg-[#101828] group-hover:text-white">Find</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VisitorMap({
  visitor,
  visitors,
  target,
  adminLocation,
  distance,
  focus,
  setFocus,
  compact = false,
  onUseMyLocation,
  onVisitorFocus,
}: {
  visitor: VisitorProfile;
  visitors: VisitorProfile[];
  target: MapTarget;
  adminLocation: AdminGeoLocation | null;
  distance: number | null;
  focus: "target" | "admin";
  setFocus: (focus: "target" | "admin") => void;
  compact?: boolean;
  onUseMyLocation: () => void;
  onVisitorFocus: (visitor: VisitorProfile) => void;
}) {
  const mapUrl = getGoogleMapEmbedUrl(focus === "admin" && adminLocation ? `${adminLocation.latitude},${adminLocation.longitude}` : target.query);
  const googleMapsUrl = getGoogleMapsUrl(target.query);
  const visitorPoints = useMemo(() => getVisitorMapPoints(visitors), [visitors]);

  return (
    <div className={`relative mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-[#dfe8ef] ${compact ? "aspect-[24/8]" : "aspect-[16/9]"}`}>
      <iframe
        title={`${target.label} map`}
        src={mapUrl}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />
      <div className="absolute inset-0">
        {visitorPoints.map((point) => (
          <button
            key={point.visitor.visitorKey}
            onClick={() => onVisitorFocus(point.visitor)}
            className="group absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/90 bg-white/80 shadow-xl shadow-slate-900/20 backdrop-blur"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={`${point.visitor.customName || point.visitor.hostname || point.visitor.ip || "Visitor"} metadata`}
            type="button"
          >
            <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white" style={{ backgroundColor: point.visitor.color }} />
            <span className="pointer-events-none absolute left-1/2 top-8 z-30 hidden w-64 -translate-x-1/2 rounded-2xl border border-white/80 bg-white/95 p-3 text-left text-xs text-(--text) shadow-2xl shadow-slate-900/20 group-hover:block">
              <span className="block font-black">{point.visitor.customName || point.visitor.hostname || point.visitor.ip || "Unknown visitor"}</span>
              <span className="mt-1 block text-(--text-secondary)">{point.visitor.city}, {point.visitor.country}</span>
              <span className="mt-2 block font-semibold">{point.visitor.browser} / {point.visitor.os}</span>
              <span className="mt-1 block text-(--text-secondary)">Risk {point.visitor.threatScore}/100 · {point.visitor.eventCount} events</span>
              <span className="mt-1 block text-(--text-secondary)">GPS {formatCoordinate(point.visitor.latitude)}, {formatCoordinate(point.visitor.longitude)}</span>
              <span className="mt-2 block font-black text-[#101828]">Click to zoom this IP group</span>
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          if (!adminLocation) {
            onUseMyLocation();
            return;
          }
          setFocus("admin");
        }}
        className="absolute bottom-5 left-5 inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-black text-(--text) shadow-xl shadow-slate-900/10 backdrop-blur-xl"
        title="Recenter to my location"
      >
        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-blue-500/20">
          <span className="absolute h-full w-full animate-ping rounded-full bg-blue-400/35" />
          <span className="relative h-3.5 w-3.5 rounded-full bg-blue-600 ring-4 ring-white" />
        </span>
        My location
      </button>
      <button
        onClick={() => setFocus("target")}
        className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-black text-(--text) shadow-xl shadow-slate-900/10 backdrop-blur-xl"
      >
        <MapPin size={17} style={{ color: visitor.color }} />
        Recenter visitor
      </button>
      <div className="absolute right-5 top-5 max-w-[min(24rem,calc(100%-2.5rem))] rounded-3xl border border-white/80 bg-white/90 p-4 text-sm text-(--text) shadow-xl shadow-slate-900/10 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-(--text-secondary)">{target.source === "ip" ? "IP Location" : target.source === "manual" ? "Manual Location" : "GPS Location"}</p>
            <p className="mt-1 font-black">{target.label}</p>
          </div>
          <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-2xl border border-(--border) bg-white px-3 py-2 text-xs font-black text-[#101828] shadow-sm">
            Open map
          </a>
        </div>
        <p className="mt-3 text-xs font-semibold text-(--text-secondary)">
          {target.latitude !== null && target.longitude !== null ? `${target.latitude.toFixed(5)}, ${target.longitude.toFixed(5)}` : target.query}
        </p>
      </div>
      <div className="absolute left-5 top-5 rounded-3xl border border-white/80 bg-white/90 p-4 text-sm font-semibold text-(--text) shadow-xl shadow-slate-900/10 backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-wide text-(--text-secondary)">Distance</p>
        <p className="mt-1 text-lg font-black">{distance ? `${formatDistanceKm(distance)} straight-line` : adminLocation ? "Coordinates needed for distance" : "Click Track to calculate"}</p>
        {adminLocation && <p className="mt-1 text-xs text-(--text-secondary)">Your GPS accuracy: {adminLocation.accuracy ? `${Math.round(adminLocation.accuracy)}m` : "unknown"}</p>}
      </div>
    </div>
  );
}

function IntelTile({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl bg-(--bg-primary) p-4">
      <div className="flex items-center gap-2 text-(--text-secondary)">
        {icon}
        <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-3 truncate font-black text-(--text)">{value}</p>
      <p className="mt-1 truncate text-xs text-(--text-secondary)">{detail}</p>
    </article>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-(--bg-primary) p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-(--text-secondary)">{label}</p>
      <p className="mt-2 text-sm font-black text-(--text)">{value}</p>
    </article>
  );
}

function DeviceOsBadge({ device, os, browser }: { device: string; os: string; browser: string }) {
  const Icon = getDeviceIcon(device);
  return (
    <div className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-(--border) bg-white px-3 py-2 shadow-sm">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#101828] text-white">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-(--text)">{getDeviceLabel(device)}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-(--text-secondary)">{browser} / {getOsLabel(os)}</span>
      </span>
    </div>
  );
}

function getDeviceIcon(device: string) {
  const normalized = device.toLowerCase();
  if (normalized.includes("tablet") || normalized.includes("ipad")) return Tablet;
  if (normalized.includes("mobile") || normalized.includes("phone") || normalized.includes("android")) return Smartphone;
  if (normalized.includes("laptop")) return Laptop;
  return Monitor;
}

function getDeviceLabel(device: string) {
  const normalized = device.toLowerCase();
  if (normalized.includes("tablet") || normalized.includes("ipad")) return "Tablet";
  if (normalized.includes("large phone")) return "Large Phone";
  if (normalized.includes("mobile") || normalized.includes("phone") || normalized.includes("android")) return "Mobile";
  if (normalized.includes("laptop")) return "Laptop";
  if (normalized.includes("desktop")) return "Desktop";
  return device || "Unknown Device";
}

function getOsLabel(os: string) {
  const normalized = os.toLowerCase();
  if (normalized.includes("mac") || normalized.includes("ios")) return "macOS";
  if (normalized.includes("win")) return "Windows";
  if (normalized.includes("linux")) return "Linux";
  if (normalized.includes("android")) return "Android";
  return os || "Unknown OS";
}

function formatDuration(value: number) {
  if (!value) return "0s";
  const seconds = Math.floor(value / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${seconds}s`;
  return `${minutes}m ${seconds % 60}s`;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function formatDistanceKm(distance: number) {
  if (distance < 1) return `${Math.round(distance * 1000).toLocaleString()} m`;
  if (distance < 100) return `${distance.toFixed(1)} km`;
  return `${Math.round(distance).toLocaleString()} km`;
}

function formatCoordinate(value: number | null) {
  return value === null ? "Not detected" : value.toFixed(6);
}

function getVisitorMapPoints(visitors: VisitorProfile[]): VisitorMapPoint[] {
  const visitorsWithCoordinates = visitors
    .map((visitor) => ({
      visitor,
      latitude: visitor.latitude ?? visitor.ipLatitude,
      longitude: visitor.longitude ?? visitor.ipLongitude,
    }))
    .filter((item): item is { visitor: VisitorProfile; latitude: number; longitude: number } => item.latitude !== null && item.longitude !== null);

  if (visitorsWithCoordinates.length === 0) {
    return visitors.map((visitor, index) => {
      const fallback = getFallbackMapPoint(visitor.visitorKey || visitor.visitorId || visitor.ip || String(index), index);
      return { visitor, x: fallback.x, y: fallback.y };
    });
  }

  const latitudes = visitorsWithCoordinates.map((item) => item.latitude);
  const longitudes = visitorsWithCoordinates.map((item) => item.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;

  return visitorsWithCoordinates.map((item, index) => {
    const spreadAngle = (index / Math.max(visitorsWithCoordinates.length, 1)) * Math.PI * 2;
    const samePlaceOffset = visitorsWithCoordinates.length > 1 ? 5 : 0;
    const rawX = lonRange === 0 ? 50 + Math.cos(spreadAngle) * samePlaceOffset : 14 + ((item.longitude - minLon) / lonRange) * 72;
    const rawY = latRange === 0 ? 50 + Math.sin(spreadAngle) * samePlaceOffset : 14 + ((maxLat - item.latitude) / latRange) * 72;
    return {
      visitor: item.visitor,
      x: clamp(rawX, 8, 92),
      y: clamp(rawY, 8, 92),
    };
  });
}

function getFallbackMapPoint(seed: string, index: number) {
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), index * 37);
  return {
    x: 16 + (hash % 68),
    y: 22 + ((hash * 7) % 48),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getBestVisitorTarget(visitor: VisitorProfile): MapTarget {
  return getVisitorLocationOptions(visitor, "", "")[0];
}

function getVisitorLocationOptions(visitor: VisitorProfile, manualLat: string, manualLon: string): MapTarget[] {
  const manualTarget = getManualLocationTarget(manualLat, manualLon);
  const options: MapTarget[] = [];

  if (manualTarget) options.push(manualTarget);

  if (visitor.latitude !== null && visitor.longitude !== null) {
    options.push({
      source: "gps",
      label: visitor.accuracy ? `Precise GPS location · ±${Math.round(visitor.accuracy)}m` : "Precise GPS location",
      query: `${visitor.latitude},${visitor.longitude}`,
      latitude: visitor.latitude,
      longitude: visitor.longitude,
    });
  }

  options.push({
    source: "ip",
    label: visitor.ipGeoSource ? `IP city location · ${visitor.ipGeoSource}` : "IP city location",
    query: [visitor.city, visitor.state, visitor.country].filter((value) => value && value !== "Unknown").join(", ") || visitor.ip || "Unknown visitor location",
    latitude: visitor.ipLatitude,
    longitude: visitor.ipLongitude,
  });

  return options;
}

function getManualLocationTarget(manualLat: string, manualLon: string): MapTarget | null {
  const latitude = Number(manualLat);
  const longitude = Number(manualLon);
  if (manualLat.trim() === "" || manualLon.trim() === "" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    source: "manual",
    label: "Manual coordinates",
    query: `${latitude},${longitude}`,
    latitude,
    longitude,
  };
}

function getGoogleMapEmbedUrl(query: string) {
  const normalized = query.trim().toLowerCase();
  const isPrivateOrUnknown = !normalized || normalized === "unknown visitor location" || normalized === "127.0.0.1" || normalized.startsWith("10.") || normalized.startsWith("192.168.") || normalized.startsWith("172.");
  return `https://maps.google.com/maps?q=${encodeURIComponent(isPrivateOrUnknown ? "world map" : query)}&z=${isPrivateOrUnknown ? 2 : 13}&output=embed`;
}

function getGoogleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getContactLocation(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "Location unknown";
  const ipGeo = (metadata as Record<string, unknown>).ipGeo;
  if (!ipGeo || typeof ipGeo !== "object") return "Location unknown";
  const values = ["city", "state", "country"]
    .map((key) => (ipGeo as Record<string, unknown>)[key])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  return values.length ? values.join(", ") : "Location unknown";
}

function getIpVersion(ip: string | null) {
  if (!ip) return "Unknown";
  return ip.includes(":") ? "IPv6" : "IPv4";
}

function visitorsToCsv(visitors: VisitorProfile[]) {
  const rows = [
    ["Name", "IP", "Country", "City", "ISP", "ASN", "Browser", "OS", "Device", "Visits", "Threat Score", "Resume Downloaded", "Last Visit"],
    ...visitors.map((visitor) => [
      visitor.customName || visitor.hostname || visitor.visitorKey,
      visitor.ip || "",
      visitor.country,
      visitor.city,
      visitor.isp,
      visitor.asn,
      visitor.browser,
      visitor.os,
      visitor.device,
      String(visitor.visitCount),
      String(visitor.threatScore),
      visitor.resumeDownloaded ? "yes" : "no",
      visitor.lastVisit,
    ]),
  ];
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SocView({ summary }: { summary: AdminSummary }) {
  const failedLogins = summary.recentSecurityLogs.filter((log) => log.eventType.includes("login") || log.reason.toLowerCase().includes("login"));
  const blockedRequests = summary.recentSecurityLogs.filter((log) => log.eventType.includes("denied") || log.reason.toLowerCase().includes("denied") || log.reason.toLowerCase().includes("blocked"));
  const botEvents = summary.recentEvents.filter((event) => event.type.toLowerCase().includes("bot") || event.path.toLowerCase().includes("bot"));
  const attackEvents = summary.recentSocEvents.filter((event) => ["critical", "high"].includes(event.severity.toLowerCase()));
  const requestVolume = summary.totals.analyticsEvents24h;
  const securityScore = getSecurityScore(summary);
  const eventTrend = buildHourlyTrend(summary.recentEvents);
  const threatTrend = buildHourlyTrend([...summary.recentSocEvents, ...summary.recentSecurityLogs]);
  const blockedIpCount = new Set(blockedRequests.map((log) => log.ip).filter(Boolean)).size;

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-(--text-secondary)">SOC Command Center</p>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />{summary.systemHealth.apiStatus}</span>
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-(--text) sm:text-4xl">Security operations overview</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-(--text-secondary)">Only backend-recorded visitor events, SOC events, admin logs, and runtime health are shown here. No sample attack data is injected.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <SocHealth label="Database" value={summary.systemHealth.databaseStatus} />
            <SocHealth label="API" value={summary.systemHealth.apiStatus} />
            <SocHealth label="Uptime" value={formatUptime(summary.systemHealth.uptimeSeconds)} />
            <SocHealth label="Heap" value={`${summary.systemHealth.memory.heapPercent}%`} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SocKpiCard icon={<ShieldAlert size={19} />} label="Open Threats" value={summary.totals.openThreats} detail={`${summary.totals.socEvents} SOC events`} data={buildHourlyTrend(summary.recentSocEvents)} tone="red" />
        <SocKpiCard icon={<UserRound size={19} />} label="Visitors" value={summary.totals.uniqueVisitors} detail={`${requestVolume} events / 24h`} data={eventTrend} tone="blue" />
        <SocKpiCard icon={<Lock size={19} />} label="Security Score" value={securityScore} detail={`${summary.recentSecurityLogs.length} logs analyzed`} data={threatTrend} tone="violet" />
        <SocKpiCard icon={<Flame size={19} />} label="Blocked IPs" value={blockedIpCount} detail={`${blockedRequests.length} blocked requests`} data={buildHourlyTrend(blockedRequests)} tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
        <AttackMapWidget summary={summary} />
        <SecurityAlertsWidget summary={summary} blockedRequests={blockedRequests} failedLogins={failedLogins} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SocPanel title="Threat Timeline" description="SOC events and admin security logs by hour">
          <AreaChart data={threatTrend} color="#ef4444" emptyLabel="No threat timeline data recorded yet." />
        </SocPanel>
        <SocPanel title="Threat Distribution" description="Recorded SOC severity mix">
          <DonutChart items={getThreatDistribution(summary)} />
        </SocPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AttackVectorList attackEvents={attackEvents} />
        <BotDetectionList botEvents={botEvents} />
        <TopAttackingIps summary={summary} />
        <VisitorAnalyticsBars summary={summary} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <LiveSecurityFeed summary={summary} />
        <SocPanel title="Server Health" description="Runtime values reported by the backend">
          <div className="grid gap-4">
            <ProgressBar label={`Memory ${summary.systemHealth.memory.heapUsedMb}MB / ${summary.systemHealth.memory.heapTotalMb}MB`} value={summary.systemHealth.memory.heapPercent} tone={summary.systemHealth.memory.heapPercent > 75 ? "amber" : "emerald"} />
            <div className="grid gap-3 sm:grid-cols-2">
              <StatusPill label="Database" value={summary.systemHealth.databaseStatus} />
              <StatusPill label="API" value={summary.systemHealth.apiStatus} />
              <StatusPill label="Uptime" value={formatUptime(summary.systemHealth.uptimeSeconds)} />
              <StatusPill label="Security Logs" value={String(summary.recentSecurityLogs.length)} />
            </div>
          </div>
        </SocPanel>
      </div>
    </section>
  );
}

function SocKpiCard({ icon, label, value, suffix = "", detail, data, tone }: { icon: ReactNode; label: string; value: number; suffix?: string; detail: string; data: number[]; tone: "emerald" | "red" | "blue" | "violet" }) {
  const color = tone === "emerald" ? "#10b981" : tone === "red" ? "#ef4444" : tone === "violet" ? "#8b5cf6" : "#2563eb";
  const toneClass = tone === "emerald" ? "text-emerald-600 bg-emerald-50" : tone === "red" ? "text-red-500 bg-red-50" : tone === "violet" ? "text-violet-600 bg-violet-50" : "text-blue-600 bg-blue-50";
  return (
    <article className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClass}`}>{icon}</span>
        <Sparkline data={data} color={color} />
      </div>
      <p className="mt-5 text-sm font-bold text-(--text-secondary)">{label}</p>
      <p className="mt-2 text-4xl font-black text-(--text)">{value}{suffix}</p>
      <p className="mt-2 text-xs font-semibold text-(--text-secondary)">{detail}</p>
    </article>
  );
}

function SocHealth({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-(--text-secondary)">{label}</p>
      <p className="mt-1 font-black text-(--text)">{value}</p>
    </div>
  );
}

function SocPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <article className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-(--text)">{title}</h2>
          <p className="mt-1 text-sm text-(--text-secondary)">{description}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#101828] text-white">
          <Radar size={17} />
        </span>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function AttackMapWidget({ summary }: { summary: AdminSummary }) {
  const sources = getThreatSources(summary);
  return (
    <SocPanel title="Recorded Source Map" description="IP sources from SOC events and admin security logs">
      <div className="relative h-[25rem] overflow-hidden rounded-3xl border border-(--border) bg-(--bg-primary)">
        <div className="absolute inset-6 rounded-[50%] border border-slate-300/60" />
        <div className="absolute inset-x-8 top-1/2 border-t border-dashed border-slate-300" />
        <div className="absolute inset-y-8 left-1/2 border-l border-dashed border-slate-300" />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          {sources.map((source) => (
            <path key={source.ip} d={`M${source.x} ${source.y} C45 42, 52 47, 58 52`} stroke={source.color} strokeWidth="0.7" fill="none" strokeDasharray="2 2" />
          ))}
        </svg>
        <div className="absolute left-[58%] top-[52%] -translate-x-1/2 -translate-y-1/2">
          <span className="absolute -inset-5 animate-ping rounded-full bg-emerald-400/20" />
          <span className="relative grid h-14 w-14 place-items-center rounded-full border border-emerald-300/60 bg-white text-emerald-600 shadow-sm"><Server size={21} /></span>
        </div>
        {sources.length === 0 && (
          <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/85 p-4 text-sm font-semibold text-(--text-secondary) shadow-sm backdrop-blur">
            No SOC or security-log source IPs recorded yet.
          </div>
        )}
        {sources.map((source) => (
          <div key={source.ip} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${source.x}%`, top: `${source.y}%` }}>
            <span className="block h-4 w-4 rounded-full ring-4" style={{ backgroundColor: source.color, boxShadow: `0 0 0 6px ${source.color}22` }} />
            <span className="mt-2 block max-w-40 truncate rounded-full bg-white/90 px-3 py-1 text-xs font-black text-(--text) shadow-sm backdrop-blur">{source.ip}</span>
          </div>
        ))}
      </div>
    </SocPanel>
  );
}

function SecurityAlertsWidget({ summary, blockedRequests, failedLogins }: { summary: AdminSummary; blockedRequests: AdminSummary["recentSecurityLogs"]; failedLogins: AdminSummary["recentSecurityLogs"] }) {
  const alerts = [
    ...summary.recentSocEvents.slice(0, 3).map((event) => ({ title: event.title, detail: event.source, tone: event.severity === "critical" || event.severity === "high" ? "red" : "amber" })),
    ...blockedRequests.slice(0, 2).map((log) => ({ title: "Blocked Request", detail: log.path, tone: "red" })),
    ...failedLogins.slice(0, 1).map((log) => ({ title: "Failed Login", detail: log.ip || "Unknown IP", tone: "amber" })),
  ];
  return (
    <SocPanel title="Security Alerts" description="Newest alerts, highest priority first">
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="rounded-2xl bg-(--bg-primary) p-4 text-sm font-semibold text-(--text-secondary)">No security alerts recorded yet.</p>
        ) : alerts.slice(0, 6).map((alert, index) => (
          <article key={`${alert.title}-${index}`} className="flex items-start gap-3 rounded-2xl border border-(--border) bg-(--bg-primary) p-4">
            <span className={`mt-1 grid h-8 w-8 place-items-center rounded-xl ${alert.tone === "red" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
              <AlertTriangle size={16} />
            </span>
            <div>
              <p className="font-black text-(--text)">{alert.title}</p>
              <p className="mt-1 text-sm text-(--text-secondary)">{alert.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </SocPanel>
  );
}

function AttackVectorList({ attackEvents }: { attackEvents: AdminSummary["recentSocEvents"] }) {
  const rows = attackEvents.map((event) => ({ name: event.title, status: event.resolvedAt ? "Resolved" : "Open", tone: event.severity }));
  return (
    <SocPanel title="Attack Detection" description="High and critical events recorded by the backend">
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-(--bg-primary) p-4 text-sm font-semibold text-(--text-secondary)">No high or critical attack events recorded yet.</p>
        ) : rows.slice(0, 6).map((row) => (
          <div key={row.name} className="flex items-center justify-between rounded-2xl bg-(--bg-primary) px-4 py-3">
            <span className="font-black text-(--text)">{row.name}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${severityClass(row.tone)}`}>{row.status}</span>
          </div>
        ))}
      </div>
    </SocPanel>
  );
}

function BotDetectionList({ botEvents }: { botEvents: AdminSummary["recentEvents"] }) {
  const rows = botEvents.map((event) => ({ name: event.type, status: event.path, tone: "amber" }));
  return (
    <SocPanel title="Bot Detection" description="Automation signals recorded in analytics events">
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-(--bg-primary) p-4 text-sm font-semibold text-(--text-secondary)">No bot or automation events recorded yet.</p>
        ) : rows.slice(0, 5).map((row) => (
          <div key={`${row.name}-${row.status}`} className="flex items-center justify-between gap-3 rounded-2xl bg-(--bg-primary) px-4 py-3">
            <span className="font-black text-(--text)">{row.name}</span>
            <span className="truncate text-sm font-bold text-amber-600">{row.status}</span>
          </div>
        ))}
      </div>
    </SocPanel>
  );
}

function TopAttackingIps({ summary }: { summary: AdminSummary }) {
  const rows = getTopSourceIps(summary);
  return (
    <SocPanel title="Top Source IPs" description="Grouped from SOC events and admin security logs">
      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-(--bg-primary) p-4 text-sm font-semibold text-(--text-secondary)">No source IP activity recorded yet.</p>
        ) : rows.map((row) => (
          <div key={row.ip} className="rounded-2xl bg-(--bg-primary) p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-black text-(--text)">{row.ip}</span>
              <span className="font-bold text-(--text-secondary)">{row.count} events</span>
            </div>
            <div className="mt-3">
              <ProgressBar label={`Activity Score ${row.score}`} value={row.score} tone={row.score > 75 ? "red" : "amber"} />
            </div>
          </div>
        ))}
      </div>
    </SocPanel>
  );
}

function VisitorAnalyticsBars({ summary }: { summary: AdminSummary }) {
  const rows = getEventTypeBreakdown(summary.recentEvents);
  return (
    <SocPanel title="Visitor Analytics" description="Recent analytics events grouped by type">
      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-(--bg-primary) p-4 text-sm font-semibold text-(--text-secondary)">No visitor analytics events recorded yet.</p>
        ) : rows.map((row, index) => (
          <ProgressBar key={row.label} label={row.label} value={row.percent} tone={index === 0 ? "cyan" : index === 1 ? "violet" : index === 2 ? "emerald" : "amber"} />
        ))}
      </div>
    </SocPanel>
  );
}

function LiveSecurityFeed({ summary }: { summary: AdminSummary }) {
  const feed = [
    ...summary.recentEvents.slice(0, 4).map((event) => ({ title: event.type, detail: event.path, time: event.createdAt, tone: "blue" })),
    ...summary.recentSecurityLogs.slice(0, 4).map((log) => ({ title: log.eventType, detail: log.reason, time: log.createdAt, tone: "red" })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return (
    <SocPanel title="Recent Events Timeline" description="Newest backend-recorded activity">
      <div className="space-y-1">
        {feed.length === 0 ? (
          <p className="rounded-2xl bg-(--bg-primary) p-4 text-sm font-semibold text-(--text-secondary)">No live events recorded yet.</p>
        ) : feed.slice(0, 8).map((item, index) => (
          <article key={`${item.title}-${index}`} className="relative flex gap-4 py-3">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.tone === "red" ? "bg-red-500" : item.tone === "amber" ? "bg-amber-400" : "bg-cyan-400"}`} />
            {index < Math.min(feed.length, 8) - 1 && <span className="absolute left-[5px] top-8 h-8 border-l border-slate-200" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-(--text)">{item.title}</p>
                <p className="text-xs text-(--text-secondary)">{new Date(item.time).toLocaleTimeString()}</p>
              </div>
              <p className="mt-1 truncate text-sm text-(--text-secondary)">{item.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </SocPanel>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-(--bg-primary) px-4 py-3">
      <span className="font-black text-(--text)">{label}</span>
      <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />{value}</span>
    </div>
  );
}

type ReportType = "visitor" | "security" | "contact" | "resume" | "projects" | "monthly";
type ReportFormat = "pdf" | "excel" | "csv" | "json";

const reportCards: Array<{ type: ReportType; label: string; detail: string; icon: ReactNode }> = [
  { type: "visitor", label: "Visitor Report", detail: "IP groups, sessions, devices, GPS/IP metadata", icon: <Globe2 size={18} /> },
  { type: "security", label: "Security Report", detail: "Login alerts, blocked requests, SOC logs", icon: <ShieldAlert size={18} /> },
  { type: "contact", label: "Contact Report", detail: "Lead messages with visitor identity links", icon: <Bell size={18} /> },
  { type: "resume", label: "Resume Downloads", detail: "Download activity grouped by visitor/IP", icon: <FileDown size={18} /> },
  { type: "projects", label: "Projects Report", detail: "Project click interest and visitor source", icon: <MousePointerClick size={18} /> },
  { type: "monthly", label: "Monthly Report", detail: "One-page admin performance summary", icon: <FileText size={18} /> },
];

const reportFields: Record<ReportType, string[]> = {
  visitor: ["visitor", "ip", "country", "city", "device", "browser", "os", "sessions", "events", "threatScore", "lastVisit"],
  security: ["event", "reason", "path", "ip", "time"],
  contact: ["name", "email", "subject", "status", "ip", "visitorId", "time"],
  resume: ["visitorId", "ip", "path", "time"],
  projects: ["visitorId", "ip", "path", "time"],
  monthly: ["metric", "value"],
};

function ReportsView({ summary }: { summary: AdminSummary }) {
  const { showToast, updateToast } = useToast();
  const [builderType, setBuilderType] = useState<ReportType>("visitor");
  const [selectedFields, setSelectedFields] = useState<string[]>(reportFields.visitor);
  const [draggingField, setDraggingField] = useState("");
  const failedLogins = summary.recentSecurityLogs.filter((log) => log.eventType.toLowerCase().includes("login") || log.reason.toLowerCase().includes("login"));
  const securityScore = getSecurityScore(summary);

  const changeBuilderType = (type: ReportType) => {
    setBuilderType(type);
    setSelectedFields(reportFields[type]);
    setDraggingField("");
  };

  const reorderField = (targetField: string) => {
    if (!draggingField || draggingField === targetField) return;
    setSelectedFields((current) => {
      const withoutDragged = current.filter((field) => field !== draggingField);
      const targetIndex = withoutDragged.indexOf(targetField);
      if (targetIndex === -1) return current;
      return [...withoutDragged.slice(0, targetIndex), draggingField, ...withoutDragged.slice(targetIndex)];
    });
    setDraggingField("");
  };

  const downloadReport = async (type: ReportType, format: ReportFormat, fields = reportFields[type]) => {
    const toastId = showToast("Preparing Report", `Generating ${type} ${format.toUpperCase()}...`, "loading");
    try {
      const params = new URLSearchParams({ type, format, fields: fields.join(",") });
      const response = await fetch(getApiUrl(`/admin/reports?${params.toString()}`), {
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "Report download failed." }));
        throw new Error(data.message || "Report download failed.");
      }
      const blob = await response.blob();
      const extension = format === "excel" ? "xls" : format;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cipherwolf-${type}-report.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
      updateToast(toastId, "Report Downloaded", `${type} report is ready.`, "success");
    } catch (err) {
      updateToast(toastId, "Report Failed", err instanceof Error ? err.message : "Could not download report.", "error");
    }
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-secondary)">Security Health Dashboard</p>
              <h2 className="mt-2 text-3xl font-black text-(--text)">Security Score: {securityScore}/100</h2>
              <p className="mt-2 text-sm leading-6 text-(--text-secondary)">Score is calculated from open threats and recent login-related security logs.</p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={22} />
            </span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <SecurityCheck icon={<ShieldCheck size={16} />} label="HTTPS Enabled" status="Ready" />
            <SecurityCheck icon={<KeyRound size={16} />} label="Password Hashed" status="bcrypt" />
            <SecurityCheck icon={<Bell size={16} />} label="2FA Enabled" status="OTP login" />
            <SecurityCheck icon={<ShieldAlert size={16} />} label="Security Headers Active" status="Helmet + CSP" />
            <SecurityCheck icon={<Database size={16} />} label="Database Protected" status="Postgres" />
            <SecurityCheck icon={<Clock3 size={16} />} label="Session Timeout" status="JWT expiry" />
            <SecurityCheck icon={<X size={16} />} label="Failed Logins Today" status={String(failedLogins.length)} warning={failedLogins.length > 0} />
            <SecurityCheck icon={<FileDown size={16} />} label="Report Export" status="Manual export" />
          </div>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-(--text)">Admin Activity Log</h2>
              <p className="mt-1 text-sm text-(--text-secondary)">Login, denied access, report and security activity for audit review.</p>
            </div>
            <span className="rounded-2xl bg-(--bg-primary) px-4 py-2 text-xs font-black text-(--text-secondary)">{summary.recentSecurityLogs.length} recent</span>
          </div>
          <div className="mt-5 space-y-3">
            {summary.recentSecurityLogs.length === 0 ? (
              <p className="rounded-2xl bg-(--bg-primary) p-4 text-sm text-(--text-secondary)">No admin security activity yet.</p>
            ) : (
              summary.recentSecurityLogs.slice(0, 6).map((log) => (
                <article key={log.id} className="rounded-2xl bg-(--bg-primary) p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-black text-(--text)">{log.eventType}</p>
                    <p className="text-xs font-semibold text-(--text-secondary)">{formatDate(log.createdAt)}</p>
                  </div>
                  <p className="mt-1 text-sm text-(--text-secondary)">{log.reason}</p>
                  <p className="mt-2 text-xs text-(--text-secondary)">{log.ip || "Unknown IP"} / {log.path}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-(--text-secondary)">Report Builder</p>
            <h2 className="mt-2 text-2xl font-black text-(--text)">Build a custom evidence report</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--text-secondary)">Select a report type, choose only the fields you need, then generate PDF, Excel, CSV, or JSON from backend records.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["pdf", "excel", "csv", "json"] as const).map((format) => (
              <button key={format} onClick={() => void downloadReport(builderType, format, selectedFields)} className="rounded-2xl bg-[#101828] px-4 py-3 text-xs font-black uppercase text-white">
                {format}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
            <p className="text-sm font-black text-(--text)">Report type</p>
            <div className="mt-3 grid gap-2">
              {reportCards.map((report) => (
                <button key={report.type} onClick={() => changeBuilderType(report.type)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${builderType === report.type ? "bg-[#101828] text-white" : "bg-white text-(--text-secondary) hover:text-(--text)"}`}>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 shadow-sm">{report.icon}</span>
                  <span className="font-black">{report.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-(--border) bg-(--bg-primary) p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-(--text)">Select fields</p>
              <button onClick={() => setSelectedFields(reportFields[builderType])} className="rounded-full bg-white px-3 py-1 text-xs font-black text-(--text)">Select all</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {reportFields[builderType].map((field) => {
                const active = selectedFields.includes(field);
                return (
                  <button
                    key={field}
                    draggable={active}
                    onDragStart={() => active && setDraggingField(field)}
                    onDragOver={(event) => active && event.preventDefault()}
                    onDrop={() => reorderField(field)}
                    onClick={() => setSelectedFields((current) => active ? current.filter((item) => item !== field) : [...current, field])}
                    className={`rounded-2xl px-4 py-2 text-sm font-black transition ${active ? "bg-emerald-50 text-emerald-700" : "bg-white text-(--text-secondary) hover:text-(--text)"}`}
                  >
                    {field}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 rounded-2xl bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-(--text-secondary)">Preview columns</p>
              <p className="mt-2 break-words text-sm font-semibold text-(--text)">{selectedFields.length ? selectedFields.join(" / ") : "No fields selected"}</p>
              <p className="mt-2 text-xs font-semibold text-(--text-secondary)">Drag selected field chips to reorder report columns.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-(--text)">Reports</h2>
            <p className="mt-1 text-sm text-(--text-secondary)">Generate Visitor, Security, Contact, Resume Download, Project, and Monthly reports from the backend admin data.</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-black text-(--text-secondary)">
            <span className="rounded-xl bg-(--bg-primary) px-3 py-2">PDF</span>
            <span className="rounded-xl bg-(--bg-primary) px-3 py-2">Excel</span>
            <span className="rounded-xl bg-(--bg-primary) px-3 py-2">CSV</span>
            <span className="rounded-xl bg-(--bg-primary) px-3 py-2">JSON</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {reportCards.map((report) => (
            <article key={report.type} className="rounded-3xl border border-(--border) bg-(--bg-primary) p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#101828] text-white">{report.icon}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-(--text)">{report.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-(--text-secondary)">{report.detail}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {(["pdf", "excel", "csv", "json"] as const).map((format) => (
                  <button key={format} onClick={() => void downloadReport(report.type, format)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black uppercase text-(--text) shadow-sm">
                    <Download size={14} />
                    {format}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecurityCheck({ icon, label, status, warning = false }: { icon: ReactNode; label: string; status: string; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-(--border) bg-(--bg-primary) p-4">
      <div className="flex items-center gap-2 text-(--text-secondary)">
        {icon}
        <p className="text-xs font-black uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-2 font-black ${warning ? "text-amber-600" : "text-emerald-600"}`}>{status}</p>
    </div>
  );
}

function ProfileView({ summary }: { summary: AdminSummary }) {
  const [avatarPreview, setAvatarPreview] = useState("/avatar.webp");
  const { showToast, updateToast } = useToast();

  const logoutAllDevices = async () => {
    const toastId = showToast("Ending Sessions", "Revoking admin sessions on every device...", "loading");
    try {
      await apiRequest("/auth/logout-all", { method: "POST", auth: true });
      clearAdminToken();
      updateToast(toastId, "Sessions Revoked", "All devices have been logged out.", "success");
      window.location.href = "/admin/login";
    } catch (err) {
      updateToast(toastId, "Logout Failed", err instanceof Error ? err.message : "Could not revoke sessions.", "error");
    }
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <img src={avatarPreview} alt="Admin profile" className="h-20 w-20 rounded-3xl object-cover" />
          <div>
            <h2 className="text-xl font-bold text-(--text)">Admin Profile</h2>
            <p className="text-sm text-(--text-secondary)">Update your name, image, and account details.</p>
          </div>
        </div>
        <label className="mt-6 flex cursor-pointer items-center justify-between rounded-2xl border border-(--border) bg-(--bg-primary) px-4 py-3 text-sm font-semibold text-(--text)">
          Upload profile picture
          <ChevronDown size={17} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setAvatarPreview(URL.createObjectURL(file));
            }}
          />
        </label>
      </div>

      <div className="space-y-6">
        <Panel title="Personal Details" empty="">
          <ProfileField label="Display name" placeholder="CipherWolf Admin" />
          <ProfileField label="Email" placeholder="admin@cipherwolf.dev" />
          <ProfileField label="WhatsApp" placeholder="+91 00000 00000" />
          <button className="rounded-2xl bg-[#101828] px-5 py-3 text-sm font-bold text-white">Save profile</button>
        </Panel>
        <Panel title="Change Password" empty="">
          <ProfileField label="Current password" placeholder="Enter current password" type="password" />
          <ProfileField label="New password" placeholder="Minimum 10 characters" type="password" />
          <ProfileField label="Confirm password" placeholder="Repeat new password" type="password" />
          <button className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white">Update password</button>
        </Panel>
        <Panel title="Login History" empty={summary.recentSecurityLogs.length === 0 ? "No login activity recorded yet." : ""}>
          {summary.recentSecurityLogs
            .filter((log) => log.eventType.toLowerCase().includes("login"))
            .slice(0, 6)
            .map((log) => (
              <article key={log.id} className="rounded-2xl bg-(--bg-primary) p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`font-black ${log.eventType === "login_success" ? "text-emerald-600" : "text-amber-600"}`}>{log.eventType === "login_success" ? "Login Success" : "Login Alert"}</p>
                  <p className="text-xs font-semibold text-(--text-secondary)">{formatDate(log.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-(--text-secondary)">{detectBrowserFromUserAgent(log.userAgent || "")} / {detectOsFromUserAgent(log.userAgent || "")}</p>
                <p className="mt-1 text-xs text-(--text-secondary)">IP: {log.ip || "Unknown"} / {log.reason}</p>
              </article>
            ))}
        </Panel>
        <Panel title="Active Sessions" empty={summary.recentAdminSessions.length === 0 ? "No admin sessions recorded yet." : ""}>
          {summary.recentAdminSessions.map((session) => (
            <article key={session.id} className="rounded-2xl bg-(--bg-primary) p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-black text-(--text)">{detectBrowserFromUserAgent(session.userAgent || "")} / {detectOsFromUserAgent(session.userAgent || "")}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${session.revokedAt ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{session.revokedAt ? "Revoked" : "Active"}</span>
              </div>
              <p className="mt-2 text-sm text-(--text-secondary)">IP: {session.ip || "Unknown"} / Created {formatDate(session.createdAt)}</p>
              <p className="mt-1 text-xs text-(--text-secondary)">Expires {formatDate(session.expiresAt)}</p>
            </article>
          ))}
          <button onClick={logoutAllDevices} className="rounded-2xl bg-[#101828] px-5 py-3 text-sm font-bold text-white">Logout from all devices</button>
        </Panel>
      </div>
    </section>
  );
}

function detectBrowserFromUserAgent(userAgent: string) {
  if (/Edg\//.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  return "Unknown Browser";
}

function detectOsFromUserAgent(userAgent: string) {
  if (/Windows NT/.test(userAgent)) return "Windows";
  if (/Mac OS X/.test(userAgent)) return "macOS";
  if (/Android/.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Unknown OS";
}

function ProfileField({ label, placeholder, type = "text", value, onChange }: { label: string; placeholder: string; type?: string; value?: string; onChange?: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-(--text-secondary)">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-(--border) bg-white px-4 py-3 text-(--text) outline-none transition focus:border-[#101828]"
      />
    </label>
  );
}

function NotificationsMenu({
  notifications,
  readIds,
  onMarkRead,
  onArchive,
  onArchiveAll,
  onOpen,
}: {
  notifications: Array<{ id: string; title: string; detail: string; severity: string; tone: string; path: string }>;
  readIds: string[];
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onArchiveAll: () => void;
  onOpen: (item: { id: string; path: string }) => void;
}) {
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  return (
    <div className="absolute right-0 top-14 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/80 bg-white p-4 shadow-2xl shadow-slate-900/15">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-(--text)">Alert Center</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-(--bg-primary) px-3 py-1 text-xs font-bold text-(--text-secondary)">{unreadCount} unread</span>
          {notifications.length > 0 && (
            <button onClick={onArchiveAll} className="rounded-full bg-[#101828] px-3 py-1 text-xs font-black text-white">
              Archive all
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2 text-xs font-black">
        <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">Critical {notifications.filter((item) => item.severity === "critical").length}</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-600">Warning {notifications.filter((item) => item.severity === "warning").length}</span>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">Info {notifications.filter((item) => item.severity === "info").length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {notifications.length === 0 ? (
          <p className="rounded-2xl bg-(--bg-primary) p-4 text-sm text-(--text-secondary)">No active alerts.</p>
        ) : (
          notifications.map((item) => (
            <div key={item.id} className={`group flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-white hover:shadow-sm ${readIds.includes(item.id) ? "bg-slate-50 opacity-75" : "bg-(--bg-primary)"}`}>
              <button onClick={() => onOpen(item)} className="flex min-w-0 flex-1 gap-3 text-left">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-(--text)">{item.title} <span className="text-[10px] uppercase text-(--text-secondary)">{readIds.includes(item.id) ? "Read" : "Unread"}</span></span>
                  <span className="mt-1 block text-xs leading-5 text-(--text-secondary)">{item.detail}</span>
                </span>
              </button>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => onMarkRead(item.id)} className="grid h-7 w-7 place-items-center rounded-full bg-white text-(--text-secondary) shadow-sm transition hover:bg-emerald-50 hover:text-emerald-600" aria-label={`Mark ${item.title} as read`}>
                  <Check size={14} />
                </button>
                <button onClick={() => onArchive(item.id)} className="grid h-7 w-7 place-items-center rounded-full bg-white text-(--text-secondary) shadow-sm transition hover:bg-red-50 hover:text-red-600" aria-label={`Archive ${item.title}`}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ContactsPanel({ summary }: { summary: AdminSummary }) {
  return (
    <Panel title="Recent Contacts" empty={summary.recentContacts.length === 0 ? "No contact messages yet." : ""}>
      {summary.recentContacts.map((contact) => (
        <article key={contact.id} className="rounded-2xl bg-(--bg-primary) p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-(--text)">{contact.name}</p>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-(--text-secondary)">{contact.status}</span>
          </div>
          <p className="mt-1 text-sm text-(--text-secondary)">{contact.email}</p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-(--text)">{contact.message}</p>
          <p className="mt-3 text-xs text-(--text-secondary)">{formatDate(contact.createdAt)}</p>
        </article>
      ))}
    </Panel>
  );
}

function VisitorEventsPanel({ summary }: { summary: AdminSummary }) {
  return (
    <Panel title="Visitor Events" empty={summary.recentEvents.length === 0 ? "No analytics events yet." : ""}>
      {summary.recentEvents.map((event) => (
        <article key={event.id} className="rounded-2xl bg-(--bg-primary) p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-(--text)">{event.type}</p>
            <p className="text-xs text-(--text-secondary)">{formatDate(event.createdAt)}</p>
          </div>
          <p className="mt-1 text-sm text-(--text-secondary)">{event.path}</p>
          <p className="mt-2 text-xs text-(--text-secondary)">{event.visitorId || event.ip || "Unknown visitor"}</p>
        </article>
      ))}
    </Panel>
  );
}

function SocQueuePanel({ summary }: { summary: AdminSummary }) {
  return (
    <Panel title="SOC Queue" empty={summary.recentSocEvents.length === 0 ? "No SOC events yet." : ""}>
      {summary.recentSocEvents.map((event) => (
        <article key={event.id} className="rounded-2xl bg-(--bg-primary) p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-(--text)">{event.title}</p>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase ${severityClass(event.severity)}`}>{event.severity}</span>
          </div>
          <p className="mt-2 text-sm text-(--text-secondary)">{event.source}{event.ip ? ` / ${event.ip}` : ""}</p>
          <p className="mt-3 text-xs text-(--text-secondary)">{formatDate(event.createdAt)}</p>
        </article>
      ))}
    </Panel>
  );
}

function SecurityLogsPanel({ summary }: { summary: AdminSummary }) {
  return (
    <Panel title="Admin Security Logs" empty={summary.recentSecurityLogs.length === 0 ? "No blocked admin attempts yet." : ""}>
      {summary.recentSecurityLogs.map((log) => (
        <article key={log.id} className="rounded-2xl bg-(--bg-primary) p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-(--text)">{log.reason}</p>
            <span className="w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-700">{log.eventType}</span>
          </div>
          <p className="mt-2 text-sm text-(--text-secondary)">{log.path}</p>
          <p className="mt-3 text-xs text-(--text-secondary)">{log.ip || "Unknown IP"} / {formatDate(log.createdAt)}</p>
        </article>
      ))}
    </Panel>
  );
}

function Panel({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-(--text)">{title}</h2>
      <div className="mt-5 space-y-4">
        {empty ? <p className="text-(--text-secondary)">{empty}</p> : children}
      </div>
    </div>
  );
}
