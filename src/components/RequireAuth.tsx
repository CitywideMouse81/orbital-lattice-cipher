import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
