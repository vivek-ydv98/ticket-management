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
  Users as UsersIcon
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

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      const response = await axios.get("/api/tickets", {
        params: { sortBy: "newest" },
        withCredentials: true,
      });
      return response.data;
    },
    enabled: !!session,
  });

  if (isPending) return null;

  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === TicketStatus.OPEN).length;
  const resolvedCount = tickets.filter((t) => t.status === TicketStatus.RESOLVED).length;
  const closedCount = tickets.filter((t) => t.status === TicketStatus.CLOSED).length;

  const stats = [
    {
      title: "Total Tickets",
      value: isLoading ? "..." : String(totalCount),
      icon: Ticket,
      trend: "All-time",
      positive: true,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      title: "Open Tickets",
      value: isLoading ? "..." : String(openCount),
      icon: Clock,
      trend: "Needs Attention",
      positive: false,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      title: "Resolved Tickets",
      value: isLoading ? "..." : String(resolvedCount),
      icon: CheckCircle,
      trend: "Successful",
      positive: true,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      title: "Closed Tickets",
      value: isLoading ? "..." : String(closedCount),
      icon: Smile,
      trend: "Archived",
      positive: true,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                {isLoading ? (
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
