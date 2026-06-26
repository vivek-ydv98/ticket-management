import { useSession, signOut } from "../lib/auth-client";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LayoutDashboard, LogOut, Users, Ticket } from "lucide-react";
import { Role } from "@/core/src/index";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const location = useLocation();
  const isAdmin = session?.user?.role === Role.ADMIN;

  const isLinkActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand/20">
      {/* Premium Glassmorphic Header */}
      <nav className="sticky top-0 z-50 flex items-center gap-4 px-6 py-4 border-b border-border/40 bg-background/60 backdrop-blur-md transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
            <ShieldAlert className="h-4 w-4 text-brand" />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Ticket Management
          </span>
        </div>

        <div className="flex gap-1 ml-8">
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              isLinkActive("/")
                ? "text-brand bg-brand/10 shadow-sm shadow-brand/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            to="/tickets"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              isLinkActive("/tickets")
                ? "text-brand bg-brand/10 shadow-sm shadow-brand/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Ticket className="h-4 w-4" />
            Tickets
          </Link>
          {isAdmin && (
            <Link
              to="/users"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isLinkActive("/users")
                  ? "text-brand bg-brand/10 shadow-sm shadow-brand/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Users className="h-4 w-4" />
              User Management
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-6">
          {/* Subtle glowing status dot */}
          <div className="flex items-center gap-2 bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">Online</span>
          </div>

          <span className="text-sm text-muted-foreground font-medium">
            Welcome back, {session?.user?.name}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      {children}
    </div>
  );
}
