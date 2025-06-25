import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/useAuth";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginSuccess, setLoginSuccess] = useState(false);
  const { refreshSubscription, isSubscribed, user, isInitializing } = useAuth();
  const navigate = useNavigate();

  // const handleLogin = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   try {
  //     const { error } = await supabase.auth.signInWithPassword({
  //       email,
  //       password,
  //     });
  //     if (error) {
  //       showError(error.message);
  //     } else {
  //       showSuccess("Logged in successfully!");
  //       const subscription = await refreshSubscription();
  //       console.log("subscription *****", subscription);
  //       if (isSubscribed) {
  //         navigate("/dashboard");
  //       } else {
  //         navigate("/billing");
  //       }
  //     }
  //   } catch (error) {
  //     const err = error as { message?: string };
  //     showError(err.message || "An unexpected error occurred.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showError(error.message);
      } else {
        showSuccess("Logged in successfully!");
        setLoginSuccess(true); // trigger effect
        // Do not navigate here
      }
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   if (loginSuccess && !isInitializing && user) {
  //     navigate("/plans");
  //   }
  // }, [loginSuccess, isInitializing, user, navigate]);

  useEffect(() => {
    if (loginSuccess && user) {
      // Refresh subscription after login
      refreshSubscription();
    }
    // eslint-disable-next-line
  }, [loginSuccess, user]);

  useEffect(() => {
    if (loginSuccess && !isInitializing && user) {
      if (isSubscribed) {
        navigate("/dashboard");
      } else {
        navigate("/plans");
      }
    }
    // eslint-disable-next-line
  }, [loginSuccess, isInitializing, user, isSubscribed, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your CRM board.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-center block">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
