import { useSession, signOut } from "../lib/auth-client";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LayoutDashboard, LogOut, Users, Ticket, Sun, Moon } from "lucide-react";
import { Role } from "@/core/src/index";
import { useTheme } from "../lib/useTheme";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const location = useLocation();
  const isAdmin = session?.user?.role === Role.ADMIN;
  const { toggleTheme } = useTheme();

  const isLinkActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 flex items-center gap-4 px-8 py-4 border-b border-border/50 bg-background/95 transition-all duration-300">
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
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
            aria-label="Toggle theme"
          >
            <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <span className="text-sm text-muted-foreground">
            {session?.user?.name}
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
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
