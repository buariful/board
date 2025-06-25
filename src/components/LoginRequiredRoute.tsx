import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const LoginRequiredRoute: React.FC = () => {
  const { user, isInitializing, session } = useAuth();
  const location = useLocation();

  console.log(
    "LoginRequiredRoute: Rendering. Path:",
    location.pathname,
    "User:",
    user?.id,
    "IsInitializing:",
    isInitializing,
    "Session:",
    !!session
  );

  if (isInitializing) {
    console.log(
      "LoginRequiredRoute: Auth is initializing. Showing skeleton screen."
    );
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <div className="flex w-full gap-4">
          <Skeleton className="h-64 w-1/4" />
          <Skeleton className="h-64 w-1/4" />
          <Skeleton className="h-64 w-1/4" />
          <Skeleton className="h-64 w-1/4" />
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("LoginRequiredRoute: No user found. Redirecting to /.");
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  console.log("LoginRequiredRoute: User logged in. Rendering Outlet.");
  return <Outlet />;
};

export default LoginRequiredRoute;
