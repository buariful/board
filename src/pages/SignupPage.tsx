import React, { useState, useEffect } from "react";
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

type Company = { id: string; name: string };

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name");
      if (!error && data) setCompanies(data);
    };
    fetchCompanies();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    if (creatingCompany && !newCompanyName.trim()) {
      showError("Please enter a company name.");
      return;
    }

    if (!creatingCompany && !selectedCompanyId) {
      showError("Please select a company.");
      return;
    }

    setLoading(true);

    try {
      let companyId = selectedCompanyId;

      if (creatingCompany) {
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .insert({ name: newCompanyName.trim() })
          .select()
          .single();

        if (companyError || !company) {
          showError(companyError?.message || "Failed to create company.");
          setLoading(false);
          return;
        }

        companyId = company.id;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        showError(authError?.message || "Signup failed.");
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase
        .from("user_profile")
        .insert({
          user_id: authData.user.id,
          email,
          company_id: companyId,
        });

      if (profileError) {
        showError(profileError.message);
        setLoading(false);
        return;
      }

      showSuccess(
        "Signup successful! Please check your email to confirm your account."
      );
      navigate("/");
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? (error as { message?: string }).message
          : "An unexpected error occurred during signup.";
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create an account to start managing your deals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
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
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label>Company</Label>
              {!creatingCompany ? (
                <>
                  <select
                    className="w-full border rounded p-2 mt-1"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                  >
                    <option value="">Select existing company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="link"
                    className="mt-1 p-0 text-sm"
                    onClick={() => setCreatingCompany(true)}
                  >
                    Or create a new company
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    className="mt-1"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="New company name"
                    required
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="mt-1 p-0 text-sm"
                    onClick={() => setCreatingCompany(false)}
                  >
                    Back to company list
                  </Button>
                </>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-center block">
          Already have an account?{" "}
          <Link to="/" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignupPage;
