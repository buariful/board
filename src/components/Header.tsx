import React from "react";
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import {
  showError,
  showSuccess,
  showLoading,
  dismissToast,
} from "@/utils/toast";

export default function Header() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    const toastId = showLoading("Logging out...");
    try {
      await logout();
      dismissToast(toastId);
      showSuccess("Logged out successfully.");
      // Navigation to / will be handled by ProtectedRoute
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Logout failed: ${error.message}`);
      console.error("Logout error:", error);
    }
  };
  return (
    <header className="px-4 md:px-8 pt-4 md:pt-8 flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
        My CRM Deals
      </h1>
      <div className="flex items-center gap-4">
        {user && (
          <Button onClick={handleLogout} variant="outline">
            Logout ({user.email?.split("@")[0]})
          </Button>
        )}
      </div>
    </header>
  );
}
