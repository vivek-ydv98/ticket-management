interface Reply {
  id: number;
  ticketId: number;
  body: string;
  senderType: "AGENT" | "CUSTOMER";
  createdAt: string | Date;
  updatedAt?: string | Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface ReplyThreadProps {
  replies: Reply[];
  isLoading: boolean;
}

export default function ReplyThread({ replies, isLoading }: ReplyThreadProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" data-testid="reply-thread-loading">
        <div className="h-20 bg-muted rounded-xl" />
        <div className="h-20 bg-muted rounded-xl" />
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-border/30 bg-card/5 text-muted-foreground text-sm">
        No replies yet. Start the conversation below.
      </div>
    );
  }

  return (
    <div className="relative pl-6 border-l border-border/20 space-y-6">
      {replies.map((reply) => {
        const isCustomer = reply.senderType === "CUSTOMER";
        const isAgent = !isCustomer && reply.user?.role === "AGENT";
        const isAdmin = !isCustomer && reply.user?.role === "ADMIN";

        return (
          <div
            key={reply.id}
            data-testid={`reply-item-${reply.id}`}
            className={
              isCustomer
                ? "relative p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm shadow-md space-y-3 transition-all hover:border-emerald-500/30"
                : "relative p-5 rounded-xl border border-border/30 bg-card/10 backdrop-blur-sm shadow-md space-y-3 transition-all hover:border-border/50"
            }
          >
            {/* Timeline dot */}
            <span
              aria-hidden="true"
              className={
                isCustomer
                  ? "absolute -left-[31px] top-7 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-background shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "absolute -left-[31px] top-7 h-2.5 w-2.5 rounded-full bg-border border border-background"
              }
            />

            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground text-sm">
                  {reply.user?.name || reply.user?.email || "Unknown User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({reply.user?.email})
                </span>

                {isAdmin && (
                  <span
                    data-testid="badge-admin"
                    className="px-2 py-0.5 text-[10px] font-bold rounded border bg-purple-500/10 text-purple-400 border-purple-500/20 uppercase tracking-wider"
                  >
                    Admin
                  </span>
                )}
                {isAgent && (
                  <span
                    data-testid="badge-agent"
                    className="px-2 py-0.5 text-[10px] font-bold rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-wider"
                  >
                    Agent
                  </span>
                )}
                {isCustomer && (
                  <span
                    data-testid="badge-customer"
                    className="px-2 py-0.5 text-[10px] font-bold rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider"
                  >
                    Customer
                  </span>
                )}
              </div>

              <span className="text-xs text-muted-foreground">
                {new Date(reply.createdAt).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>

            <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {reply.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
