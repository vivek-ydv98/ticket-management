import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertTriangle } from "lucide-react";

interface DeleteUserConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName?: string;
  isDeleting: boolean;
  error?: string | null;
}

export default function DeleteUserConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  isDeleting,
  error,
}: DeleteUserConfirmModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isDeleting && onClose()}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/40 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Delete User Account</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-foreground">{userName || "this user"}</span>? This will deactivate their profile, revoke all their active sessions, and prevent future sign-ins. This action is irreversible.
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 border-border/40 hover:bg-muted/30 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-900/10 hover:shadow-red-900/20 transition-all duration-300"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
