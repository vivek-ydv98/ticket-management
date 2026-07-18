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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function BarShape3D(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill = "#aa3bff" } = props;
  const d = Math.min(width * 0.35, 5);
  const solid = "#7c3aed";

  return (
    <g>
      <polygon
        points={`${x},${y} ${x + d},${y - d} ${x + width + d},${y - d} ${x + width},${y}`}
        fill={solid}
        opacity={0.65}
      />
      <polygon
        points={`${x + width},${y} ${x + width + d},${y - d} ${x + width + d},${y + height - d} ${x + width},${y + height}`}
        fill={solid}
        opacity={0.35}
      />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />
    </g>
  );
}

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

interface StatsData {
  totalTickets: number;
  openTickets: number;
  resolvedByAI: number;
  percentResolvedByAI: number;
  averageResolutionTimeMs: number;
  ticketsPerDay?: { date: string; count: number }[];
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-bold text-foreground">{payload[0].value} tickets</p>
    </div>
  );
}

export default function Home() {
  const { data: session, isPending } = useSession();

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

  const chartData = statsData?.ticketsPerDay?.map(d => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    count: d.count,
  })) ?? [];

  return (
    <Layout>
      <main className="px-8 py-10 space-y-8">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground tracking-wide">
            Support Operations Center
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time ticket metrics and AI resolution performance
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="relative overflow-hidden hover:shadow-[0_8px_30px_-6px_rgba(59,130,246,0.35)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
            <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-blue-500/5 blur-2xl" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 flex items-center justify-center ring-1 ring-blue-500/20">
                  <Ticket className="h-[18px] w-[18px] text-blue-500" />
                </div>
                <span className="text-[11px] font-semibold tracking-wide text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">
                  Total
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                Total Tickets
              </p>
              <p className="text-3xl font-bold text-foreground">
                {isStatsLoading ? "—" : (statsData?.totalTickets ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                All-time queue volume
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-[0_8px_30px_-6px_rgba(217,119,6,0.35)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
            <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-amber-500/5 blur-2xl" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center ring-1 ring-amber-500/20">
                  <Clock className="h-[18px] w-[18px] text-amber-500" />
                </div>
                <span className="text-[11px] font-semibold tracking-wide text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">
                  Open
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                Open Backlog
              </p>
              <p className="text-3xl font-bold text-foreground">
                {isStatsLoading ? "—" : (statsData?.openTickets ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Awaiting agent response
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-[0_8px_30px_-6px_rgba(170,59,255,0.35)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand/70 to-brand" />
            <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-brand/10 blur-2xl" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center ring-1 ring-brand/20">
                  <Sparkles className="h-[18px] w-[18px] text-brand" />
                </div>
                <span className="text-[11px] font-semibold tracking-wide text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                  AI
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                AI Auto-Resolved
              </p>
              <p className="text-3xl font-bold text-foreground">
                {isStatsLoading ? "—" : (statsData?.resolvedByAI ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Resolved without human agent
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-[0_8px_30px_-6px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-emerald-500/5 blur-2xl" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <Percent className="h-[18px] w-[18px] text-emerald-500" />
                </div>
                <span className="text-[11px] font-semibold tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  Rate
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                AI Resolution Rate
              </p>
              <p className="text-3xl font-bold text-foreground">
                {isStatsLoading ? "—" : `${statsData?.percentResolvedByAI ?? 0}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Total auto-resolve accuracy
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <Card className="lg:col-span-3 relative overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand/70 to-brand" />
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-brand" />
                  <h2 className="text-base font-semibold text-foreground">
                    Ticket Volume Trend
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 inline-block" />
                  Created Tickets
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Daily ticket creation over the last 30 days
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {isStatsLoading ? (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                  Loading chart data...
                </div>
              ) : chartData.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 10, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="barFrontGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="50%" stopColor="#aa3bff" />
                          <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #6b7280)" }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--color-border, #e5e7eb)" }}
                        interval="preserveStartEnd"
                        minTickGap={40}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #6b7280)" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted, #f3f4f6)" }} />
                      <Bar
                        dataKey="count"
                        fill="url(#barFrontGrad)"
                        shape={<BarShape3D />}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                  No ticket data available.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-400 to-pink-600" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-pink-500" />
                <h2 className="text-base font-semibold text-foreground">
                  Avg Resolution
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Average ticket duration
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-4xl font-bold text-foreground">
                {isStatsLoading ? "—" : formatDuration(statsData?.averageResolutionTimeMs ?? 0)}
              </p>
              <div className="mt-6 pt-4 border-t border-border/40">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Zap className="h-[18px] w-[18px] text-pink-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Latency metric</p>
                    <p className="text-xs font-medium text-foreground">Mean time to resolve</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="relative overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand/70 to-brand" />
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-brand" />
                <h2 className="text-base font-semibold text-foreground">Recent Tickets</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last 5 tickets
              </p>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="divide-y divide-border/30">
                {isTicketsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                      <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-muted rounded" />
                        <div className="h-3 w-56 bg-muted/60 rounded" />
                      </div>
                      <div className="h-4 w-12 bg-muted rounded" />
                    </div>
                  ))
                ) : recentTickets.length > 0 ? (
                  recentTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="shrink-0 h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center">
                        <Ticket className="text-brand h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                          <span className="font-medium">{ticket.assignedTo || "Unassigned"}</span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-medium ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTimeAgo(ticket.createdAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No tickets found.
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/40 pt-4 pb-4">
              <Link
                to="/tickets"
                className="text-sm font-medium text-brand hover:text-brand-hover inline-flex items-center gap-1 transition-colors"
              >
                View All Tickets
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardFooter>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand/70 to-brand" />
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-brand" />
                <h2 className="text-base font-semibold text-foreground">Team Performance</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agent productivity metrics
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-4">
              <div className="space-y-3">
                {["Agent Smith", "Agent Jones", "Agent Davis", "Agent Wilson"].map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-brand">
                        {name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-sm font-medium text-foreground">{name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-emerald-500">85%</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400"
                          style={{ width: "85%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/40 pt-4 pb-4">
              <Link
                to="/users"
                className="text-sm font-medium text-brand hover:text-brand-hover inline-flex items-center gap-1 transition-colors"
              >
                View Team Stats
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
    </Layout>
  );
}
