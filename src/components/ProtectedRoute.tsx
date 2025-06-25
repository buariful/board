import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const ProtectedRoute: React.FC = () => {
  const { user, isSubscribed, isInitializing, session } = useAuth();
  const location = useLocation();

  console.log(
    "ProtectedRoute (SubscriptionRequired): Rendering. Path:",
    location.pathname,
    "User:",
    user?.id,
    "IsSubscribed:",
    isSubscribed,
    "IsInitializing:",
    isInitializing,
    "Session:",
    !!session
  );

  if (isInitializing) {
    console.log(
      "ProtectedRoute (SubscriptionRequired): Auth is initializing. Showing skeleton screen."
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
    console.log(
      "ProtectedRoute (SubscriptionRequired): No user found. Redirecting to /."
    );
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // if (!isSubscribed) {
  //   console.log(
  //     "ProtectedRoute (SubscriptionRequired): User logged in but not subscribed. Redirecting to /billing."
  //   );
  //   return <Navigate to="/billing" state={{ from: location }} replace />;
  // }

  console.log(
    "ProtectedRoute (SubscriptionRequired): User logged in and subscribed. Rendering Outlet."
  );
  return <Outlet />;
};

export default ProtectedRoute;
