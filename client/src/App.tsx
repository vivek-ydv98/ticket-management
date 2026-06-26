import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSession, AdminRoute } from "./lib/auth-client";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Users from "./pages/Users";
import TicketsPage from "./pages/Tickets";
import TicketDetailsPage from "./pages/TicketDetails";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const location = useLocation();
  if (isPending) return null;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const location = useLocation();
  if (isPending) return null;
  if (session) {
    const from = (location.state as any)?.from?.pathname ?? "/";
    const target = from.endsWith("/") ? from : `${from}/`;
    return <Navigate to={target} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
      <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetailsPage /></ProtectedRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}