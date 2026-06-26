import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ReplyFormProps {
  onSubmit: (body: string) => Promise<void>;
  isSubmitting: boolean;
}

export default function ReplyForm({ onSubmit, isSubmitting }: ReplyFormProps) {
  const [replyBody, setReplyBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || isSubmitting) return;
    try {
      await onSubmit(replyBody);
      setReplyBody("");
    } catch (error) {
      // Error handling is managed by parent query mutation/alerts
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
          disabled={isSubmitting}
          maxLength={4000}
          className="w-full min-h-[110px] rounded-lg border border-border/45 bg-background/30 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer disabled:opacity-50"
          rows={4}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !replyBody.trim()}
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
