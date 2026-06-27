import { useSession } from "../lib/auth-client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import Layout from "../components/Layout";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Ticket,
  CheckCircle,
  Clock,
  Smile,
  ArrowRight,
  TrendingUp,
  User,
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

  const stats = [
    {
      title: "Total Tickets",
      value: isStatsLoading ? "..." : String(statsData?.totalTickets ?? 0),
      icon: Ticket,
      trend: "All-time",
      positive: true,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      title: "Open Tickets",
      value: isStatsLoading ? "..." : String(statsData?.openTickets ?? 0),
      icon: Clock,
      trend: "Needs Attention",
      positive: false,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      title: "AI Resolved",
      value: isStatsLoading ? "..." : String(statsData?.resolvedByAI ?? 0),
      icon: Sparkles,
      trend: "Automated",
      positive: true,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      title: "AI Success Rate",
      value: isStatsLoading ? "..." : `${statsData?.percentResolvedByAI ?? 0}%`,
      icon: Percent,
      trend: "Efficiency",
      positive: true,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      title: "Avg Resolution Time",
      value: isStatsLoading ? "..." : formatDuration(statsData?.averageResolutionTimeMs ?? 0),
      icon: Zap,
      trend: "Speed",
      positive: true,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20"
    },
  ];

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
        return "text-red-400";
      case TicketPriority.MEDIUM:
        return "text-amber-400";
      case TicketPriority.LOW:
        return "text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return "text-blue-400";
      case TicketStatus.RESOLVED:
        return "text-emerald-400";
      case TicketStatus.CLOSED:
        return "text-zinc-400";
      default:
        return "text-muted-foreground";
    }
  };

  const recentTickets = tickets.slice(0, 5);

  return (
    <Layout>
      <main className="px-6 py-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Welcome Section with subtle gradient text */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent mb-2">
            Welcome to the Support Dashboard
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Monitor ticket trends, team performance, and customer satisfaction metrics in real-time.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className={`border-${stat.border} bg-card/40 backdrop-blur-md hover:bg-card/60 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300 border relative overflow-hidden group`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center border border-border/40 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/20`}>
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{stat.title}</h3>
                  <p className="text-3xl font-bold mt-2 text-foreground tracking-tight">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 30-Day Ticket Volume Bar Chart */}
        <Card className="border-border/40 bg-card/30 backdrop-blur-md border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand" />
                Ticket Volume (Last 30 Days)
              </h3>
              <p className="text-xs text-muted-foreground">Daily ticket creation count</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-3 w-3 rounded bg-gradient-to-t from-brand to-blue-400 inline-block"></span>
                Tickets Created
              </div>
            </div>
          </div>

          {isStatsLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Loading chart data...
            </div>
          ) : statsData?.ticketsPerDay && statsData.ticketsPerDay.length > 0 ? (
            (() => {
              const maxCount = Math.max(...statsData.ticketsPerDay.map(d => d.count), 5);
              return (
                <>
                  <div className="h-48 flex items-end gap-1.5 pt-6 pb-2 border-b border-border/20 relative">
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
                    {statsData.ticketsPerDay.map((day) => {
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
                            style={{ height: `${Math.max(4, heightPercent)}%` }}
                            className="w-full rounded-t-sm bg-gradient-to-t from-brand/60 to-blue-500/80 group-hover:from-brand group-hover:to-blue-400 transition-all duration-300 relative shadow-sm"
                          >
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-300 opacity-60 rounded-t-sm" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X-axis labels (showing every 5th label to prevent crowding) */}
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1 select-none">
                    {statsData.ticketsPerDay.map((day, idx) => {
                      const isVisible = idx === 0 || idx === statsData.ticketsPerDay.length - 1 || idx % 5 === 0;
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
          <Card className="border-border/40 bg-card/30 backdrop-blur-md hover:bg-card/40 transition-all duration-300 border flex flex-col justify-between">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-brand" />
                <h2 className="text-xl font-bold text-foreground">Recent Tickets</h2>
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
                    <div key={ticket.id} className="flex items-center gap-4 p-4 hover:bg-muted/10 transition-colors duration-200">
                      <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                        <Ticket className="text-brand h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm truncate">{ticket.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                          <span>{ticket.assignedTo || "Unassigned"}</span>
                          <span className="text-border">•</span>
                          <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                          <span className="text-border">•</span>
                          <span className={getStatusColor(ticket.status)}>{ticket.status}</span>
                        </p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand/10 text-brand border border-brand/20 whitespace-nowrap">
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
            <CardFooter className="py-4 border-t border-border/40 bg-muted/5 rounded-b-lg">
              <Link to="/tickets" className="text-sm font-semibold text-brand hover:text-brand-hover flex items-center gap-1 group transition-colors duration-200">
                View All Tickets
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardFooter>
          </Card>

          {/* Team Performance Card */}
          <Card className="border-border/40 bg-card/30 backdrop-blur-md hover:bg-card/40 transition-all duration-300 border flex flex-col justify-between">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-brand" />
                <h2 className="text-xl font-bold text-foreground">Team Performance</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Agent productivity metrics
              </p>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              <div className="space-y-4">
                {["Agent Smith", "Agent Jones", "Agent Davis", "Agent Wilson"].map((name, index) => (
                  <div key={index} className="flex items-center justify-between p-3.5 border border-border/30 rounded-xl bg-card/20 hover:border-brand/30 hover:bg-card/40 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                        <User className="text-brand h-4 w-4" />
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
            <CardFooter className="py-4 border-t border-border/40 bg-muted/5 rounded-b-lg">
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
