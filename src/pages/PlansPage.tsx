import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/useAuth";
import Header from "@/components/Header";

interface LemonSqueezyPlan {
  id: string; // Variant ID from Lemon Squeezy (stringified number)
  name: string; // Variant name (e.g., "Default")
  price: number; // In cents (e.g., 10000 = $100.00)
  interval: "day" | "week" | "month" | "year"; // Billing interval
  is_subscription: boolean; // Whether it's a recurring plan
  product_id: number; // Numeric ID of the product
  product_name: string; // Name of the product (e.g., "Starter")
  product_description: string; // HTML string description
  checkout_url: string;
}

const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<LemonSqueezyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscription } = useAuth();

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the current logged-in user's access token
      const session = supabase.auth.getSession
        ? await supabase.auth.getSession()
        : null;
      const accessToken = session?.data?.session?.access_token || null;

      // Your Supabase Edge Function URL
      const functionUrl =
        "https://szfmzdhzdclxugzqejfc.supabase.co/functions/v1/list-lemon-squeezy-plans";

      const res = await fetch(functionUrl, {
        method: "GET", // or POST if your function expects POST
        headers: {
          "Content-Type": "application/json",
          // Pass the access token for authorization if needed
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Function call failed: ${errorText}`);
      }

      const data = await res.json();
      console.log(data);
      if (!Array.isArray(data?.plans)) {
        throw new Error("Unexpected data format from function");
      }

      setPlans(data.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // const plans = [
  //   {
  //     name: "Starter",
  //     price: 100,
  //     price_formatted: "$100",
  //     description: "Simple description for Starter plan.",
  //     checkout_url:
  //       "https://ardev.lemonsqueezy.com/buy/cf2a4077-b5ee-4c49-a7e1-540757f7f310",
  //   },
  //   {
  //     name: "Platinum",
  //     price: 150,
  //     price_formatted: "$150",
  //     description: "Simple description for Platinum plan.",
  //     checkout_url:
  //       "https://ardev.lemonsqueezy.com/buy/e761a092-f967-4aa6-842a-17b36238ef9d",
  //   },
  // ];

  return (
    <div className="min-h-screen  bg-gray-100 dark:bg-gray-900 ">
      <Header />
      <div className="flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl ">
          <h1 className="text-3xl font-bold mb-2 text-center">
            Available Plans
          </h1>
          <h2 className="text-xl text-center text-gray-600 mb-4">
            Choose the plan that fits your needs
          </h2>
          <p className="text-center text-gray-500 mb-8">
            Unlock premium features and get the most out of our platform.
            Upgrade, downgrade, or cancel anytime.
          </p>
          <div className="mb-10">
            {plans.map((plan, index) => (
              <div className="max-w-md mx-auto mb-6" key={plan?.product_name}>
                <Card className="">
                  <CardHeader>
                    <CardTitle>{plan?.product_name}</CardTitle>
                    <CardDescription
                      dangerouslySetInnerHTML={{
                        __html: plan?.product_description || "",
                      }}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold mb-2">
                      {plan?.price / 100}{" "}
                      <span className="text-gray-600 text-sm">
                        /{plan?.interval}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {plan?.product_id === subscription?.product_id ? (
                      <Button
                        disabled={true}
                        asChild
                        className="w-full cursor-not-allowed bg-slate-500"
                      >
                        <p>Current Plan</p>
                      </Button>
                    ) : (
                      <Button
                        disabled={plan?.product_id === subscription?.product_id}
                        asChild
                        className="w-full"
                      >
                        <a
                          href={plan?.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Choose Plan
                        </a>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
          {/* FAQ Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">
              Frequently Asked Questions
            </h3>
            <ul className="space-y-3">
              <li>
                <strong>Can I change my plan later?</strong>
                <p className="text-gray-500">
                  Yes, you can upgrade or downgrade your plan at any time from
                  your dashboard.
                </p>
              </li>
              <li>
                <strong>Is there a free trial?</strong>
                <p className="text-gray-500">
                  All plans come with a 7-day free trial. Cancel anytime before
                  the trial ends to avoid charges.
                </p>
              </li>
              <li>
                <strong>What payment methods are accepted?</strong>
                <p className="text-gray-500">
                  We accept all major credit cards and PayPal.
                </p>
              </li>
              <li>
                <strong>How do I cancel my subscription?</strong>
                <p className="text-gray-500">
                  You can cancel your subscription from your account settings.
                  Your access will remain until the end of the billing period.
                </p>
              </li>
            </ul>
          </div>
          {/* Testimonials Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
              What Our Users Say
            </h3>
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-gray-800 rounded p-4 shadow">
                <p className="italic text-gray-700 dark:text-gray-300">
                  “This platform has transformed the way I work. The premium
                  features are worth every penny!”
                </p>
                <div className="text-right mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                  — Alex D.
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded p-4 shadow">
                <p className="italic text-gray-700 dark:text-gray-300">
                  “Excellent customer support and easy to use. Highly
                  recommended!”
                </p>
                <div className="text-right mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                  — Jamie L.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
