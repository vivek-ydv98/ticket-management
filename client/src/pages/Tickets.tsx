import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Ticket as TicketIcon,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Calendar,
  User,
  X,
  Clock,
  AlertCircle
} from "lucide-react";
import { TicketStatus, TicketCategory, TicketPriority } from "@/core/src/index";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  priority: TicketPriority;
  createdAt: string | Date;
  updatedAt: string | Date;
  assignedTo: string | null;
}

export default function TicketsPage() {
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true }
  ]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: assignees = [] } = useQuery<any[]>({
    queryKey: ["assignees"],
    queryFn: async () => {
      const response = await axios.get("/api/users/assignees", {
        withCredentials: true,
      });
      return response.data;
    },
  });

  const sortBy = sorting[0]?.id || "createdAt";
  const sortOrder = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "desc";

  const {
    data: ticketsData,
    isLoading,
    error,
  } = useQuery<{ tickets: Ticket[]; total: number; totalPages: number }>({
    queryKey: ["tickets", statusFilter, categoryFilter, priorityFilter, sortBy, sortOrder, search, page],
    queryFn: async () => {
      const response = await axios.get("/api/tickets", {
        params: {
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          priority: priorityFilter || undefined,
          sortBy,
          sortOrder,
          search: search || undefined,
          page,
          limit,
        },
        withCredentials: true,
      });
      return response.data;
    },
    enabled: !!session,
  });

  const tickets = ticketsData?.tickets ?? [];
  const total = ticketsData?.total ?? 0;
  const totalPages = ticketsData?.totalPages ?? 1;

  if (isPending) return null;

  const formattedError = error
    ? axios.isAxiosError(error)
      ? error.response?.data?.message || `Failed to fetch tickets: ${error.response?.status}`
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred"
    : null;

  // Helper colors for badges
  const getStatusStyle = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.NEW:
        return "bg-violet-500/10 text-violet-400 border-violet-500/20";
      case TicketStatus.PROCESSING:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse";
      case TicketStatus.OPEN:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case TicketStatus.RESOLVED:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case TicketStatus.CLOSED:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityStyle = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.HIGH:
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case TicketPriority.MEDIUM:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case TicketPriority.LOW:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryLabel = (category: TicketCategory | null) => {
    if (!category) return "Uncategorized";
    switch (category) {
      case TicketCategory.GENERAL:
        return "General";
      case TicketCategory.TECHNICAL:
        return "Technical";
      case TicketCategory.REFUND_REQUEST:
        return "Refund Request";
      default:
        return category;
    }
  };

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Ticket ID",
        cell: (info) => `#${info.getValue()}`,
      },
      {
        accessorKey: "title",
        header: "Subject / Description",
        cell: (info) => {
          const ticket = info.row.original;
          return (
            <div className="space-y-1">
              <Link
                to={`/tickets/${ticket.id}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                <h4 className="font-semibold text-foreground text-sm group-hover:text-brand transition-colors truncate">
                  {ticket.title}
                </h4>
              </Link>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {ticket.description || "No description provided."}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: (info) => {
          const value = info.getValue() as TicketCategory | null;
          return (
            <span className="text-xs font-medium text-foreground/80 px-2 py-0.5 bg-muted/60 border border-border/20 rounded-md">
              {getCategoryLabel(value)}
            </span>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: (info) => {
          const value = info.getValue() as TicketPriority;
          return (
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityStyle(value)}`}>
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const value = info.getValue() as TicketStatus;
          return (
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusStyle(value)}`}>
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: "assignedTo",
        header: "Assigned To",
        cell: (info) => {
          const value = info.getValue() as string | null;
          return (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 opacity-60" />
              <span className="truncate max-w-[120px]">
                {value || "Unassigned"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: (info) => {
          const value = info.getValue() as string | Date;
          return (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 opacity-60" />
              <span>{new Date(value).toLocaleDateString()}</span>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-8 space-y-8 animate-fade-in relative">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Tickets Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Filter, sort, search, and manage support tickets. Click a ticket to inspect details.
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col lg:flex-row gap-4 p-4 rounded-xl border border-border/40 bg-card/20 backdrop-blur-md shadow-md shadow-black/5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title, description or agent..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              maxLength={200}
              className="pl-10 bg-background/50 border-border/40 focus-visible:ring-brand/30 focus-visible:border-brand"
            />
          </div>

          {/* Filters and Sorting selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-border/40 bg-background/50 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value={TicketStatus.NEW}>New</option>
                <option value={TicketStatus.PROCESSING}>Processing</option>
                <option value={TicketStatus.OPEN}>Open</option>
                <option value={TicketStatus.RESOLVED}>Resolved</option>
                <option value={TicketStatus.CLOSED}>Closed</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden sm:inline">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-border/40 bg-background/50 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value={TicketCategory.GENERAL}>General</option>
                <option value={TicketCategory.TECHNICAL}>Technical</option>
                <option value={TicketCategory.REFUND_REQUEST}>Refund Request</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden sm:inline">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-border/40 bg-background/50 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value={TicketPriority.LOW}>Low</option>
                <option value={TicketPriority.MEDIUM}>Medium</option>
                <option value={TicketPriority.HIGH}>High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error state banner */}
        {formattedError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{formattedError}</span>
          </div>
        )}

        {/* Tickets Table / List */}
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card/20 backdrop-blur-md shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/20">
              <thead className="bg-muted/30">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isSortable = ["id", "title", "category", "priority", "status", "assignedTo", "createdAt"].includes(header.column.id);
                      const sortDirection = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider select-none"
                        >
                          {header.isPlaceholder ? null : isSortable ? (
                            <button
                              onClick={header.column.getToggleSortingHandler()}
                              className="flex items-center gap-1 hover:text-brand transition-colors font-bold uppercase cursor-pointer"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {sortDirection === "asc" ? (
                                <ChevronUp className="h-3.5 w-3.5 text-brand" />
                              ) : sortDirection === "desc" ? (
                                <ChevronDown className="h-3.5 w-3.5 text-brand" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                              )}
                            </button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className={`divide-y divide-border/10 ${isLoading ? "bg-card/10" : "bg-card/5"}`}>
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((_, i) => (
                    <tr key={i} className="hover:bg-muted/10 animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 w-12 rounded bg-muted" /></td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="h-4 w-48 rounded bg-muted" />
                          <div className="h-3.5 w-64 rounded bg-muted/60" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-5 w-20 rounded-full bg-muted" /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-5 w-16 rounded-full bg-muted" /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-5 w-16 rounded-full bg-muted" /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 w-28 rounded bg-muted" /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 w-20 rounded bg-muted" /></td>
                    </tr>
                  ))
                ) : (
                  <>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedTicket(row.original)}
                        className="hover:bg-muted/30 transition-all duration-200 border-b border-border/10 last:border-b-0 cursor-pointer group"
                      >
                        {row.getVisibleCells().map((cell) => {
                          let tdClassName = "px-6 py-4 whitespace-nowrap text-sm text-muted-foreground group-hover:text-foreground transition-colors";
                          if (cell.column.id === "id") {
                            tdClassName = "px-6 py-4 whitespace-nowrap text-sm font-bold text-muted-foreground group-hover:text-brand transition-colors";
                          } else if (cell.column.id === "title") {
                            tdClassName = "px-6 py-4 max-w-md";
                          }
                          return (
                            <td key={cell.id} className={tdClassName}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {tickets.length === 0 && (
                      <tr>
                        <td
                          className="px-6 py-12 text-center text-muted-foreground"
                          colSpan={7}
                        >
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <TicketIcon className="h-8 w-8 opacity-40 text-brand" />
                            <p className="font-semibold text-sm">No tickets found</p>
                            <p className="text-xs max-w-xs">
                              Try clearing filters or search term to see other items.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {tickets.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/10 px-6 pb-4 bg-card/5">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{Math.min((page - 1) * limit + 1, total)}</span> to{" "}
                <span className="font-semibold text-foreground">{Math.min(page * limit, total)}</span> of{" "}
                <span className="font-semibold text-foreground">{total}</span> tickets
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="h-8 text-xs font-semibold px-3 cursor-pointer disabled:opacity-50"
                >
                  Previous
                </Button>
                
                {/* Page indicators */}
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    // Only show first, last, and pages around current page for clean aesthetics
                    if (totalPages > 5 && p !== 1 && p !== totalPages && Math.abs(p - page) > 1) {
                      if (p === 2 || p === totalPages - 1) {
                        return <span key={p} className="text-muted-foreground text-xs px-1">...</span>;
                      }
                      return null;
                    }
                    return (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(p)}
                        className={`h-8 w-8 text-xs font-semibold p-0 cursor-pointer ${p === page ? "bg-brand text-brand-foreground hover:bg-brand-hover" : ""}`}
                      >
                        {p}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="h-8 text-xs font-semibold px-3 cursor-pointer disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Backdrop for Slide-over Details Drawer */}
        {selectedTicket && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSelectedTicket(null)}
          />
        )}

        {/* Premium Detail Slide-Over Drawer */}
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-card border-l border-border/40 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
            selectedTicket ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selectedTicket && (
            <>
              {/* Drawer Header */}
              <div className="p-6 border-b border-border/40 flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                    <TicketIcon className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">
                      Ticket Details
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      Ticket #{selectedTicket.id}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTicket(null)}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-muted/80"
                  aria-label="Close details"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Title */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Subject
                  </span>
                  <h2 className="text-xl font-bold text-foreground leading-snug">
                    {selectedTicket.title}
                  </h2>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 border border-border/30 rounded-xl bg-card/40">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                      Status
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full border inline-block ${getStatusStyle(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                      Priority
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border inline-block ${getPriorityStyle(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                      Category
                    </span>
                    <span className="text-xs font-semibold text-foreground/80 px-2 py-0.5 bg-muted/80 border border-border/20 rounded-md inline-block">
                      {getCategoryLabel(selectedTicket.category)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                      Assigned Agent
                    </span>
                    <select
                      value={selectedTicket.assignedTo || ""}
                      onChange={async (e) => {
                        const val = e.target.value;
                        const email = val === "" ? null : val;
                        try {
                          await axios.patch(
                            `/api/tickets/${selectedTicket.id}`,
                            { assignedTo: email },
                            { withCredentials: true }
                          );
                          setSelectedTicket({
                            ...selectedTicket,
                            assignedTo: email,
                          });
                          queryClient.invalidateQueries({ queryKey: ["tickets"] });
                        } catch (err) {
                          console.error("Failed to assign ticket:", err);
                          alert("Failed to assign ticket.");
                        }
                      }}
                      className="h-8 rounded-md border border-border/40 bg-background/50 px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer w-full"
                    >
                      <option value="">Unassigned</option>
                      {assignees.map((agent: any) => (
                        <option key={agent.id} value={agent.email}>
                          {agent.name || agent.email} ({agent.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                    Description
                  </span>
                  <div className="p-4 border border-border/30 rounded-xl bg-muted/10 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description || "No description provided."}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="pt-4 border-t border-border/30 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Last Updated: {new Date(selectedTicket.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-border/40 bg-muted/5 flex gap-3">
                <Button
                  onClick={() => setSelectedTicket(null)}
                  className="w-full bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg py-2 shadow-sm"
                >
                  Close Details
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}
