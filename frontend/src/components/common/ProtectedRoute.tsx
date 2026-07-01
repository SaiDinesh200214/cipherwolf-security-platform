import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiRequest, clearAdminToken } from "../../services/api";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;

    const logAttempt = async (reason: string, metadata?: Record<string, unknown>) => {
      await apiRequest("/security/admin-route-attempt", {
        method: "POST",
        body: JSON.stringify({
          path: `${location.pathname}${location.search}`,
          reason,
          metadata,
        }),
      }).catch(() => undefined);
    };

    apiRequest("/auth/me", { auth: true })
      .then(() => {
        if (!cancelled) setStatus("allowed");
      })
      .catch((error: Error) => {
        clearAdminToken();
        logAttempt("Admin route access with invalid token.", { error: error.message }).finally(() => {
          if (!cancelled) setStatus("denied");
        });
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  if (status === "checking") {
    return (
      <main className="min-h-screen bg-(--bg-primary) px-6 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-(--border) bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-(--text)">Checking session</h1>
          <p className="mt-3 text-(--text-secondary)">Opening the control center...</p>
        </div>
      </main>
    );
  }

  if (status === "denied") {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
}
