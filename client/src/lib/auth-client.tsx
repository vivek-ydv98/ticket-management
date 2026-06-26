import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { Navigate } from "react-router-dom";
import type { auth } from "../../../server/lib/auth";
import { Role } from "@/core/src/index";

export const { signIn, signOut, useSession } = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>()
  ]
});

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (session.user?.role !== Role.ADMIN) {
    return <Navigate to="/" replace />;
  }
  return children;
}
