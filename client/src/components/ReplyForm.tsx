import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Sparkles } from "lucide-react";
import axios from "axios";

interface ReplyFormProps {
  onSubmit: (body: string) => Promise<void>;
  isSubmitting: boolean;
  ticketId?: number;
}

export default function ReplyForm({ onSubmit, isSubmitting, ticketId }: ReplyFormProps) {
  const [replyBody, setReplyBody] = useState("");
  const [isPolishing, setIsPolishing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || isSubmitting || isPolishing) return;
    try {
      await onSubmit(replyBody);
      setReplyBody("");
    } catch {
      // Error handling is managed by parent query mutation/alerts
    }
  };

  const handlePolish = async () => {
    if (!replyBody.trim() || isPolishing || isSubmitting) return;
    setIsPolishing(true);
    try {
      const response = await axios.post(
        "/api/tickets/polish",
        { body: replyBody.trim(), ticketId },
        { withCredentials: true }
      );
      if (response.data && response.data.text) {
        setReplyBody(response.data.text);
      }
    } catch (error) {
      console.error("Failed to polish reply:", error);
      alert("Failed to polish reply using AI.");
    } finally {
      setIsPolishing(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 rounded-xl border border-border/40 bg-card/20 backdrop-blur-md shadow-lg shadow-black/10 space-y-4"
    >
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Post a Reply
      </h3>
      <div className="space-y-3">
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Type your message here..."
          disabled={isSubmitting || isPolishing}
          maxLength={4000}
          className="w-full min-h-[110px] rounded-lg border border-border/45 bg-background/30 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer disabled:opacity-50"
          rows={4}
        />
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={handlePolish}
            disabled={isSubmitting || isPolishing || !replyBody.trim()}
            className="gap-2 cursor-pointer border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold transition-all duration-300 shadow-sm shadow-emerald-500/5 hover:shadow-emerald-500/10 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none"
          >
            <Sparkles className={`h-4 w-4 ${isPolishing ? "animate-spin" : "animate-pulse"}`} />
            {isPolishing ? "Polishing..." : "Polish Reply"}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isPolishing || !replyBody.trim()}
            className="gap-2 cursor-pointer bg-brand hover:bg-brand/90 text-white font-semibold transition-all shadow-md shadow-brand/10"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Posting..." : "Submit Reply"}
          </Button>
        </div>
      </div>
    </form>
  );
}
