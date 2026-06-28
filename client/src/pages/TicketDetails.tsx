import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Layout from "../components/Layout";
import ReplyForm from "../components/ReplyForm";
import ReplyThread from "../components/ReplyThread";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  ArrowLeft,
  Clock,
  AlertCircle,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { TicketStatus, TicketCategory, TicketPriority } from "@/core/src/index";

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

interface Assignee {
  id: string;
  name: string | null;
  email: string;
}

interface Reply {
  id: number;
  ticketId: number;
  body: string;
  senderType: "AGENT" | "CUSTOMER";
  createdAt: string | Date;
  updatedAt: string | Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export default function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const response = await axios.post(`/api/tickets/${id}/summarize`, {}, {
        withCredentials: true,
      });
      setSummary(response.data.summary);
    } catch (err) {
      console.error("Failed to generate summary:", err);
      alert("Failed to generate ticket summary.");
    } finally {
      setIsSummarizing(false);
    }
  };


  const statusLabels: Record<TicketStatus, string> = {
    [TicketStatus.NEW]: "New",
    [TicketStatus.PROCESSING]: "Processing",
    [TicketStatus.OPEN]: "Open",
    [TicketStatus.RESOLVED]: "Resolved",
    [TicketStatus.CLOSED]: "Closed",
  };

  const priorityLabels: Record<TicketPriority, string> = {
    [TicketPriority.LOW]: "Low",
    [TicketPriority.MEDIUM]: "Medium",
    [TicketPriority.HIGH]: "High",
  };

  const categoryLabels: Record<TicketCategory, string> = {
    [TicketCategory.GENERAL]: "General",
    [TicketCategory.TECHNICAL]: "Technical",
    [TicketCategory.REFUND_REQUEST]: "Refund Request",
  };

  const { data: assignees = [] } = useQuery<Assignee[]>({
    queryKey: ["assignees"],
    queryFn: async () => {
      const response = await axios.get("/api/users/assignees", {
        withCredentials: true,
      });
      return response.data;
    },
  });

  const handleUpdate = async (fields: Partial<Ticket>) => {
    setIsUpdating(true);
    try {
      await axios.patch(
        `/api/tickets/${id}`,
        fields,
        { withCredentials: true }
      );
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch (err) {
      console.error("Failed to update ticket:", err);
      alert("Failed to update ticket.");
    } finally {
      setIsUpdating(false);
    }
  };

  const { data: replies = [], isLoading: isLoadingReplies } = useQuery<Reply[]>({
    queryKey: ["ticket", id, "replies"],
    queryFn: async () => {
      const response = await axios.get(`/api/tickets/${id}/replies`, {
        withCredentials: true,
      });
      return response.data;
    },
    enabled: !!id,
  });

  const handleSubmitReply = async (body: string) => {
    setIsSubmittingReply(true);
    try {
      await axios.post(
        `/api/tickets/${id}/replies`,
        { body: body.trim() },
        { withCredentials: true }
      );
      queryClient.invalidateQueries({ queryKey: ["ticket", id, "replies"] });
    } catch (err) {
      console.error("Failed to submit reply:", err);
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.message || "Failed to submit reply.");
      } else {
        alert("Failed to submit reply.");
      }
      throw err;
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery<Ticket>({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const response = await axios.get(`/api/tickets/${id}`, {
        withCredentials: true,
      });
      return response.data;
    },
    enabled: !!id,
  });

  const getStatusStyle = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.NEW:
        return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
      case TicketStatus.PROCESSING:
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 animate-pulse";
      case TicketStatus.OPEN:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case TicketStatus.RESOLVED:
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case TicketStatus.CLOSED:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  const formattedError = error
    ? axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : "Failed to load ticket details."
    : null;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-8 space-y-6 animate-fade-in">
        {/* Back Link */}
        <div className="flex items-center">
          <Link to="/tickets">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              Back to Queue
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-8 w-1/3 bg-muted rounded" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        ) : formattedError ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{formattedError}</span>
          </div>
        ) : ticket ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand uppercase tracking-wider bg-brand/10 px-3 py-1 rounded-full border border-brand/25">
                    Ticket #{ticket.id}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusStyle(ticket.status)}`}>
                    {statusLabels[ticket.status]}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                  {ticket.title}
                </h1>
              </div>
            </div>

            {/* Grid Layout for details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left description column */}
              <div className="md:col-span-2 space-y-6">
                <div className="p-6 rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 to-card/25 backdrop-blur-md shadow-lg shadow-black/5 hover:border-brand/20 transition-all duration-300 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </h3>
                  <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {ticket.description || "No description provided."}
                  </div>
                </div>

                {/* Summarize Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSummarize}
                      disabled={isSummarizing}
                      variant="outline"
                      className="gap-2 cursor-pointer border-brand/30 hover:border-brand/60 bg-brand/10 hover:bg-brand/15 text-brand hover:shadow-lg hover:shadow-brand/5 transition-all duration-200"
                    >
                      <Sparkles className={`h-4 w-4 text-brand ${isSummarizing ? 'animate-spin' : ''}`} />
                      {isSummarizing ? "Summarizing..." : "Summarize Conversation"}
                    </Button>
                  </div>

                  {summary && (
                    <div className="p-6 rounded-2xl border border-brand/20 bg-brand/5 backdrop-blur-md shadow-lg space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2 text-brand">
                        <Sparkles className="h-4 w-4" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">
                          AI Conversation Summary
                        </h4>
                      </div>
                      <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                        {summary}
                      </div>
                    </div>
                  )}
                </div>

                {/* Replies Thread */}
                <div className="space-y-6 pt-4">
                  <div className="flex items-center gap-2 border-b border-border/25 pb-3">
                    <MessageSquare className="h-5 w-5 text-brand" />
                    <h2 className="text-lg font-bold text-foreground">
                      Replies ({replies.length})
                    </h2>
                  </div>

                  <ReplyThread replies={replies} isLoading={isLoadingReplies} />

                  {/* Reply Form */}
                  <ReplyForm onSubmit={handleSubmitReply} isSubmitting={isSubmittingReply} ticketId={ticket?.id} />
                </div>
              </div>

              {/* Right metadata column */}
              <div className="md:col-span-1 space-y-6">
                <div className="p-6 rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 to-card/25 backdrop-blur-md shadow-lg shadow-black/5 hover:border-brand/20 transition-all duration-300 space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/10 pb-3">
                    Properties
                  </h3>

                  {/* Status */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label htmlFor="ticket-status-select" className="text-xs text-muted-foreground font-semibold uppercase tracking-wider col-span-1">Status</label>
                    <div className="col-span-2">
                      <select
                        id="ticket-status-select"
                        value={ticket.status}
                        onChange={async (e) => {
                          await handleUpdate({ status: e.target.value as TicketStatus });
                        }}
                        disabled={isUpdating}
                        className="w-full h-9 rounded-md border border-border/40 bg-background/50 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer disabled:opacity-50"
                      >
                        {Object.values(TicketStatus).map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label htmlFor="ticket-priority-select" className="text-xs text-muted-foreground font-semibold uppercase tracking-wider col-span-1">Priority</label>
                    <div className="col-span-2">
                      <select
                        id="ticket-priority-select"
                        value={ticket.priority}
                        onChange={async (e) => {
                          await handleUpdate({ priority: e.target.value as TicketPriority });
                        }}
                        disabled={isUpdating}
                        className="w-full h-9 rounded-md border border-border/40 bg-background/50 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer disabled:opacity-50"
                      >
                        {Object.values(TicketPriority).map((priority) => (
                          <option key={priority} value={priority}>
                            {priorityLabels[priority]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label htmlFor="ticket-category-select" className="text-xs text-muted-foreground font-semibold uppercase tracking-wider col-span-1">Category</label>
                    <div className="col-span-2">
                      <select
                        id="ticket-category-select"
                        value={ticket.category || ""}
                        onChange={async (e) => {
                          await handleUpdate({ category: (e.target.value || null) as TicketCategory | null });
                        }}
                        disabled={isUpdating}
                        className="w-full h-9 rounded-md border border-border/40 bg-background/50 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer disabled:opacity-50"
                      >
                        <option value="">Uncategorized</option>
                        {Object.values(TicketCategory).map((cat) => (
                          <option key={cat} value={cat}>
                            {categoryLabels[cat]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Assigned Agent */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label htmlFor="ticket-agent-select" className="text-xs text-muted-foreground font-semibold uppercase tracking-wider col-span-1">Agent</label>
                    <div className="col-span-2">
                      <select
                        id="ticket-agent-select"
                        value={ticket.assignedTo || ""}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await handleUpdate({ assignedTo: val === "" ? null : val });
                        }}
                        disabled={isUpdating}
                        className="w-full h-9 rounded-md border border-border/40 bg-background/50 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer disabled:opacity-50"
                      >
                        <option value="">Unassigned</option>
                        {assignees.map((agent) => (
                          <option key={agent.id} value={agent.email}>
                            {agent.name || agent.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="space-y-3 pt-3 border-t border-border/10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Updated: {new Date(ticket.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </Layout>
  );
}
