import { Navigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading } = useSession();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  return <Navigate to={user ? "/chats" : "/login"} replace />;
};

export default Index;
