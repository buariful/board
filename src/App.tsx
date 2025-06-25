import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import BillingPage from "./pages/BillingPage";
import PlansPage from "./pages/PlansPage";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginRequiredRoute from "./components/LoginRequiredRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner position="top-right" duration={5000} />
        <BrowserRouter>
          <Routes>
            {/* Public routes: LoginPage is now the root/home page */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />{" "}
            {/* Optional: keep /login as an alias */}
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/plans" element={<PlansPage />} />
            {/* Routes requiring only login (e.g., billing page) */}
            <Route element={<LoginRequiredRoute />}>
              <Route path="/billing" element={<BillingPage />} />
            </Route>
            {/* Routes requiring login AND active subscription */}
            <Route element={<ProtectedRoute />}>
              {/* Index (KanbanBoard) is now at /dashboard */}
              <Route path="/dashboard" element={<Index />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
