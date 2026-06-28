import { useSession } from "../lib/auth-client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Ticket,
  Clock,
  ArrowRight,
  TrendingUp,
  Users as UsersIcon,
  Sparkles,
  Percent,
  Zap
} from "lucide-react";
import { TicketStatus, TicketPriority } from "@/core/src/index";

interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string | Date;
  updatedAt: string | Date;
  assignedTo: string | null;
}

export default function Home() {
  const { data: session, isPending } = useSession();

  interface StatsData {
    totalTickets: number;
    openTickets: number;
    resolvedByAI: number;
    percentResolvedByAI: number;
    averageResolutionTimeMs: number;
    ticketsPerDay?: { date: string; count: number }[];
  }

  const { data: statsData, isLoading: isStatsLoading } = useQuery<StatsData>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await axios.get("/api/tickets/stats", {
        withCredentials: true,
      });
      return response.data;
    },
    enabled: !!session,
  });

  const { data: ticketsData, isLoading: isTicketsLoading } = useQuery<{ tickets: Ticket[]; total: number }>({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      const response = await axios.get("/api/tickets", {
        params: { sortBy: "newest", limit: 5 },
        withCredentials: true,
      });
      return response.data;
    },
    enabled: !!session,
  });

  if (isPending) return null;

  const tickets = ticketsData?.tickets ?? [];

  const formatDuration = (ms: number) => {
    if (ms <= 0) return "N/A";
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return "< 1m";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const formatTimeAgo = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.HIGH:
        return "text-red-600 dark:text-red-400";
      case TicketPriority.MEDIUM:
        return "text-amber-700 dark:text-amber-400";
      case TicketPriority.LOW:
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return "text-blue-600 dark:text-blue-400";
      case TicketStatus.RESOLVED:
        return "text-emerald-700 dark:text-emerald-400";
      case TicketStatus.CLOSED:
        return "text-zinc-500 dark:text-zinc-400";
      default:
        return "text-muted-foreground";
    }
  };

  const recentTickets = tickets.slice(0, 5);

  return (
    <Layout>
      <main className="px-6 py-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Welcome Section with badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Support Operations Center
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent leading-none">
            Dashboard Overview
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Real-time analytics on ticket velocity, queue latency, and artificial intelligence resolution metrics.
          </p>
        </div>

        {/* Bento Grid layout: Asymmetric 6-column system */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {/* Card 1: Total Tickets (span 3) */}
          <Card className="md:col-span-3 border-blue-500/20 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-md hover:bg-card/90 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300 relative overflow-hidden group rounded-2xl p-6 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Ticket className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Cumulative
                </span>
              </div>
              <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Total Tickets Raised</h3>
              <p className="text-5xl font-extrabold mt-2 text-foreground tracking-tighter">
                {isStatsLoading ? "..." : (statsData?.totalTickets ?? 0)}
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
              <span>All-time queue volume</span>
              <span className="text-blue-400 font-medium flex items-center gap-1">Active Monitoring</span>
            </div>
          </Card>

          {/* Card 2: Open Tickets (span 3) */}
          <Card className="md:col-span-3 border-amber-500/20 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-md hover:bg-card/90 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300 relative overflow-hidden group rounded-2xl p-6 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                  Needs Attention
                </span>
              </div>
              <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Open Backlog</h3>
              <p className="text-5xl font-extrabold mt-2 text-foreground tracking-tighter">
                {isStatsLoading ? "..." : (statsData?.openTickets ?? 0)}
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
              <span>Awaiting agent response</span>
              <span className="text-amber-400 font-medium flex items-center gap-1">Backlog Priority</span>
            </div>
          </Card>

          {/* Card 3: AI Resolved (span 2) */}
          <Card className="md:col-span-2 border-brand/20 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-md hover:bg-card/90 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300 relative overflow-hidden group rounded-2xl p-5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full blur-2xl pointer-events-none group-hover:bg-brand/10 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="h-4.5 w-4.5 text-brand" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                  Automated
                </span>
              </div>
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">AI Auto-Resolved</h3>
              <p className="text-3xl font-extrabold mt-1.5 text-foreground tracking-tight">
                {isStatsLoading ? "..." : (statsData?.resolvedByAI ?? 0)}
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border/10 text-[11px] text-muted-foreground">
              Resolved without human agent
            </div>
          </Card>

          {/* Card 4: AI Success Rate (span 2) */}
          <Card className="md:col-span-2 border-emerald-500/20 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-md hover:bg-card/90 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300 relative overflow-hidden group rounded-2xl p-5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Percent className="h-4.5 w-4.5 text-emerald-500" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Efficiency
                </span>
              </div>
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">AI Resolution Rate</h3>
              <p className="text-3xl font-extrabold mt-1.5 text-foreground tracking-tight">
                {isStatsLoading ? "..." : `${statsData?.percentResolvedByAI ?? 0}%`}
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border/10 text-[11px] text-muted-foreground">
              Total auto-resolve accuracy
            </div>
          </Card>

          {/* Card 5: Avg Resolution Time (span 2) */}
          <Card className="md:col-span-2 border-pink-500/20 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-md hover:bg-card/90 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300 relative overflow-hidden group rounded-2xl p-5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-pink-500/10 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-9 w-9 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-4.5 w-4.5 text-pink-500" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  Latency
                </span>
              </div>
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Avg Resolution</h3>
              <p className="text-3xl font-extrabold mt-1.5 text-foreground tracking-tight">
                {isStatsLoading ? "..." : formatDuration(statsData?.averageResolutionTimeMs ?? 0)}
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border/10 text-[11px] text-muted-foreground">
              Average ticket duration state
            </div>
          </Card>
        </div>

        {/* 30-Day Ticket Volume Bar Chart */}
        <Card className="border-border/40 bg-gradient-to-br from-card/50 to-card/25 backdrop-blur-md border p-6 space-y-6 rounded-2xl shadow-lg shadow-black/5 hover:border-brand/30 transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
                <TrendingUp className="h-5 w-5 text-brand" />
                Ticket Volume Trend
              </h3>
              <p className="text-xs text-muted-foreground">Daily ticket creation velocity over the last 30 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-muted-foreground px-2.5 py-1 rounded-md bg-muted/30 border border-border/20">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-brand to-blue-400 inline-block"></span>
                Created Tickets
              </div>
            </div>
          </div>

          {isStatsLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Loading chart data...
            </div>
          ) : statsData?.ticketsPerDay && statsData.ticketsPerDay.length > 0 ? (
            (() => {
              const ticketsPerDay = statsData.ticketsPerDay;
              const maxCount = Math.max(...ticketsPerDay.map(d => d.count), 5);
              return (
                <>
                  <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-border/20 relative">
                    {/* Gridlines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 text-[10px] text-muted-foreground select-none">
                      <div className="border-t border-dashed border-muted-foreground/50 w-full pt-1">
                        {Math.round(maxCount)}
                      </div>
                      <div className="border-t border-dashed border-muted-foreground/50 w-full pt-1">
                        {Math.round(maxCount * 0.75)}
                      </div>
                      <div className="border-t border-dashed border-muted-foreground/50 w-full pt-1">
                        {Math.round(maxCount * 0.5)}
                      </div>
                      <div className="border-t border-dashed border-muted-foreground/50 w-full pt-1">
                        {Math.round(maxCount * 0.25)}
                      </div>
                      <div className="w-full">0</div>
                    </div>

                    {/* Bars */}
                    {ticketsPerDay.map((day) => {
                      const heightPercent = (day.count / maxCount) * 100;
                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center group relative h-full justify-end z-10"
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-[10px] font-medium py-1 px-2 rounded border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30">
                            {new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: <span className="font-bold text-brand">{day.count} tickets</span>
                          </div>

                          {/* Bar */}
                          <div
                            style={{ height: `${Math.max(6, heightPercent)}%` }}
                            className="w-full rounded-t-lg bg-gradient-to-t from-brand/20 via-brand/60 to-brand group-hover:from-brand/40 group-hover:to-brand transition-all duration-300 relative shadow-inner group-hover:shadow-[0_0_12px_rgba(170,59,255,0.25)]"
                          >
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/30 opacity-80 rounded-t-lg" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X-axis labels (showing every 5th label to prevent crowding) */}
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1 select-none">
                    {ticketsPerDay.map((day, idx) => {
                      const isVisible = idx === 0 || idx === ticketsPerDay.length - 1 || idx % 5 === 0;
                      const formattedDate = new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                      return (
                        <div key={day.date} className={`w-0 overflow-visible text-center ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                          <span className="whitespace-nowrap -translate-x-1/2 inline-block">
                            {formattedDate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No ticket data available.
            </div>
          )}
        </Card>

        {/* Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Tickets Card */}
          <Card className="border-border/40 bg-gradient-to-br from-card/50 to-card/25 backdrop-blur-md hover:border-brand/20 transition-all duration-300 border flex flex-col justify-between rounded-2xl shadow-lg shadow-black/5">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-brand" />
                <h2 className="text-xl font-bold text-foreground tracking-tight">Recent Tickets</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Last 5 tickets updated
              </p>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-border/30">
                {isTicketsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                      <div className="h-9 w-9 rounded-lg bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-muted rounded" />
                        <div className="h-3 w-56 bg-muted/60 rounded" />
                      </div>
                      <div className="h-4 w-12 bg-muted rounded" />
                    </div>
                  ))
                ) : recentTickets.length > 0 ? (
                  recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center gap-4 p-4 hover:bg-brand/5 dark:hover:bg-brand/5 border-b border-border/10 last:border-b-0 transition-colors duration-200 cursor-pointer">
                      <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                        <Ticket className="text-brand h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm truncate">{ticket.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
                          <span className="font-medium text-foreground/80">{ticket.assignedTo || "Unassigned"}</span>
                          <span className="text-border">•</span>
                          <span className={`font-semibold ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                          <span className="text-border">•</span>
                          <span className={`font-semibold ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-brand/10 text-brand border border-brand/25 whitespace-nowrap">
                        {formatTimeAgo(ticket.createdAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No tickets found.
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="py-4 border-t border-border/40 bg-muted/5 rounded-b-2xl">
              <Link to="/tickets" className="text-sm font-semibold text-brand hover:text-brand-hover flex items-center gap-1 group transition-colors duration-200">
                View All Tickets
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardFooter>
          </Card>

          {/* Team Performance Card */}
          <Card className="border-border/40 bg-gradient-to-br from-card/50 to-card/25 backdrop-blur-md hover:border-brand/20 transition-all duration-300 border flex flex-col justify-between rounded-2xl shadow-lg shadow-black/5">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-brand" />
                <h2 className="text-xl font-bold text-foreground tracking-tight">Team Performance</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Agent productivity metrics
              </p>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              <div className="space-y-4">
                {["Agent Smith", "Agent Jones", "Agent Davis", "Agent Wilson"].map((name, index) => (
                  <div key={index} className="flex items-center justify-between p-3.5 border border-border/20 rounded-xl bg-card/10 hover:border-brand/40 hover:bg-brand/5 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand/20 to-blue-500/20 flex items-center justify-center border border-brand/20 text-xs font-bold text-brand">
                        {name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="font-semibold text-foreground text-sm">{name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-semibold text-emerald-400">85%</span>
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden border border-border/20">
                        <div className="h-full bg-gradient-to-r from-brand to-emerald-400 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="py-4 border-t border-border/40 bg-muted/5 rounded-b-2xl">
              <Link to="/users" className="text-sm font-semibold text-brand hover:text-brand-hover flex items-center gap-1 group transition-colors duration-200">
                View Team Stats
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
    </Layout>
  );
}
