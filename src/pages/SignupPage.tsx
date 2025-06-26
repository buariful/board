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
          role: creatingCompany ? "admin" : "user",
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

// const body = {
//   data: {
//     id: "1296613",
//     type: "subscriptions",
//     links: {
//       self: "https://api.lemonsqueezy.com/v1/subscriptions/1296613",
//     },
//     attributes: {
//       urls: {
//         customer_portal:
//           "https://ardev.lemonsqueezy.com/billing?expires=1750918075&test_mode=1&user=5108003&signature=d486e8830cb25b3aafaca9c1a516083d0172269271c6be0d6dc17624e19fdb4e",
//         update_payment_method:
//           "https://ardev.lemonsqueezy.com/subscription/1296613/payment-details?expires=1750918075&signature=b0137c77b78f2531ad3b36adec8d8a28edab6e4e9c69c9699ac220372f48accc",
//         customer_portal_update_subscription:
//           "https://ardev.lemonsqueezy.com/billing/1296613/update?expires=1750918075&user=5108003&signature=28e20fcd9b466172d707bf98d2140d33003e7232f8243494b5e9607e62df8ff7",
//       },
//       pause: null,
//       status: "active",
//       ends_at: null,
//       order_id: 5807669,
//       store_id: 194128,
//       cancelled: false,
//       renews_at: "2025-07-26T00:07:49.000000Z",
//       test_mode: true,
//       user_name: "Selina gomez",
//       card_brand: "visa",
//       created_at: "2025-06-26T00:07:50.000000Z",
//       product_id: 560099,
//       updated_at: "2025-06-26T00:07:55.000000Z",
//       user_email: "myuser@mailinator.com",
//       variant_id: 870803,
//       customer_id: 6131593,
//       product_name: "Platinum",
//       variant_name: "Default",
//       order_item_id: 5744701,
//       trial_ends_at: null,
//       billing_anchor: 26,
//       card_last_four: "4242",
//       status_formatted: "Active",
//       payment_processor: "stripe",
//       first_subscription_item: {
//         id: 2760419,
//         price_id: 1344429,
//         quantity: 1,
//         created_at: "2025-06-26T00:07:55.000000Z",
//         updated_at: "2025-06-26T00:07:55.000000Z",
//         is_usage_based: false,
//         subscription_id: 1296613,
//       },
//     },
//     relationships: {
//       order: {
//         links: {
//           self: "https://api.lemonsqueezy.com/v1/subscriptions/1296613/relationships/order",
//           related:
//             "https://api.lemonsqueezy.com/v1/subscriptions/1296613/order",
//         },
//       },
//       store: {
//         links: {
//           self: "https://api.lemonsqueezy.com/v1/subscriptions/1296613/relationships/store",
//           related:
//             "https://api.lemonsqueezy.com/v1/subscriptions/1296613/store",
//         },
//       },
//       product: {
//         links: {
//           self: "https://api.lemonsqueezy.com/v1/subscriptions/1296613/relationships/product",
//           related:
//             "https://api.lemonsqueezy.com/v1/subscriptions/1296613/product",
//         },
//       },
//       variant: {
//         links: {
//           self: "https://api.lemonsqueezy.com/v1/subscriptions/1296613/relationships/variant",
//           related:
//             "https://api.lemonsqueezy.com/v1/subscriptions/1296613/variant",
//         },
//       },
//       customer: {
//         links: {
//           self: "https://api.lemonsqueezy.com/v1/subscriptions/1296613/relationships/customer",
//           related:
//             "https://api.lemonsqueezy.com/v1/subscriptions/1296613/customer",
//         },
//       },
//       "order-item": {
//         links: {
//           self: "https://api.lemonsqueezy.com/v1/subscriptions/1296613/relationships/order-item",
//           related:
//             "https://api.lemonsqueezy.com/v1/subscriptions/1296613/order-item",
//         },
//       },
//       "subscription-items": {
//         links: {
//           self: "https://api.lemonsqueezy.com/v1/subscriptions/1296613/relationships/subscription-items",
//           related:
//             "https://api.lemonsqueezy.com/v1/subscriptions/1296613/subscription-items",
//         },
//       },
//       "subscription-invoices": {
//         links: {
//           self: "https://api.lemonsqueezy.com/v1/subscriptions/1296613/relationships/subscription-invoices",
//           related:
//             "https://api.lemonsqueezy.com/v1/subscriptions/1296613/subscription-invoices",
//         },
//       },
//     },
//   },
//   meta: {
//     test_mode: true,
//     event_name: "subscription_created",
//     webhook_id: "92a4dd09-75a5-44a3-afbf-4bda2a872ccf",
//   },
// };

// import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// import { createClient } from "npm:@supabase/supabase-js";
// const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// const LEMONSQUEEZY_WEBHOOK_SECRET = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// // Helper to convert hex string to Uint8Array
// function hexToBytes(hex) {
//   const bytes = new Uint8Array(hex.length / 2);
//   for(let i = 0; i < bytes.length; i++){
//     bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
//   }
//   return bytes;
// }
// // Validate HMAC-SHA256 signature of the raw body
// async function validateSignature(body, signature, secret) {
//   const keyData = new TextEncoder().encode(secret);
//   const cryptoKey = await crypto.subtle.importKey("raw", keyData, {
//     name: "HMAC",
//     hash: "SHA-256"
//   }, false, [
//     "verify"
//   ]);
//   const signatureData = hexToBytes(signature);
//   return crypto.subtle.verify("HMAC", cryptoKey, signatureData, body);
// }
// serve(async (req)=>{
//   if (req.method !== "POST") {
//     return new Response("Method Not Allowed", {
//       status: 405
//     });
//   }
//   const signature = req.headers.get("x-signature") || "";
//   const bodyBytes = new Uint8Array(await req.arrayBuffer());
//   // Verify signature
//   const isValid = await validateSignature(bodyBytes, signature, LEMONSQUEEZY_WEBHOOK_SECRET);
//   if (!isValid) {
//     console.warn("Invalid LemonSqueezy webhook signature");
//     return new Response("Invalid signature", {
//       status: 401
//     });
//   }
//   try {
//     const bodyText = new TextDecoder().decode(bodyBytes);
//     // const body = JSON.parse(bodyText);
//     const email = body.data.attributes.user_email || body.data.attributes.buyer_email;
//     const subsId = body.data.id;
//     const planId = body.data.attributes.product_id;
//     const status = body.data.attributes.status;
//     const startedAt = body.data.attributes.created_at ? new Date(body.data.attributes.created_at).toISOString() : null;
//     const endedAt = body.data.attributes.renews_at ? new Date(body.data.attributes.renews_at).toISOString() : null;
//     const event_name = body.meta.event_name;;

//     if (!email || !subsId) {
//       return new Response("Missing email or subscription id", {
//         status: 400
//       });
//     }
//     // Find user_profile by email
//     const { data: userProfile, error: userError } = await supabase.from("user_profile").select("id").eq("email", email).limit(1).single();
//     if (userError || !userProfile) {
//       console.error("User profile not found:", userError);
//       return new Response("User profile not found", {
//         status: 404
//       });
//     }

//     // Upsert subscription
//     if(event_name === "subscription_created"){
//       const { error: upsertError } = await supabase.from("subscription").upsert({
//         lemonsqueezy_subs_id: subsId,
//         user_profile_id: userProfile.id,
//         plan_id: planId,
//         status,
//         started_at: startedAt,
//         ended_at: endedAt,
//         updated_at: new Date().toISOString()
//       }, {
//         onConflict: "lemonsqueezy_subs_id"
//       });
//       if (upsertError) {
//         console.error("Failed to upsert subscription:", upsertError);
//         return new Response("Failed to upsert subscription", {
//           status: 500
//         });
//       }
//     }

//     if(event_name === "subscription_cancelled"){
//       await supabase.from('orders').update({
//         status: "cancelled",
//         updated_at: new Date().toISOString(),
//       }).eq('lemonsqueezy_subs_id', body.data.id);
//     }

//     return new Response("Webhook processed", {
//       status: 200
//     });
//   } catch (error) {
//     console.error("Error processing webhook:", error);
//     return new Response("Internal Server Error", {
//       status: 500
//     });
//   }
// });
